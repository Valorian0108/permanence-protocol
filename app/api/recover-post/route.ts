import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { getAuthenticatedWallet } from '../../../lib/server-auth';
import {
  getIdeaByTransactionHash,
  getIdeaForResponse,
  getResponseByTransactionHash,
  saveIdea,
  saveResponse,
  contributorHasNickname,
} from '../../../lib/server-supabase';
import { verifyPostRecoveryTicket } from '../../../lib/post-recovery';

export const runtime = 'nodejs';

const contractAddress = '0x213B5321d98B2E01204C827712Ca9D580cEF9bEd';
const contractInterface = new ethers.Interface([
  'event IdeaPosted(uint256 indexed ideaId, string contentHash, address indexed submitter, uint256 timestamp)',
  'event ResponsePosted(uint256 indexed ideaId, uint256 indexed responseId, string contentHash, uint8 responseType, address indexed submitter, uint256 timestamp)',
]);

function getProvider() {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error('Blockchain RPC is not configured');
  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function POST(request: NextRequest) {
  try {
    const walletAddress = await getAuthenticatedWallet(request);
    if (!walletAddress) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!await contributorHasNickname(walletAddress)) {
      return NextResponse.json({ error: 'Choose a nickname before recovering a contribution' }, { status: 428 });
    }

    const body = await request.json();
    const { content, contentHash, recoveryTicket } = body;
    if (typeof content !== 'string' || typeof contentHash !== 'string' || typeof recoveryTicket !== 'string') {
      return NextResponse.json({ error: 'content, contentHash, and recoveryTicket are required' }, { status: 400 });
    }
    if (!content.trim() || content.length > 10000) {
      return NextResponse.json({ error: 'Content must be between 1 and 10000 characters' }, { status: 400 });
    }

    const expectedHash = `0x${createHash('sha256').update(content, 'utf8').digest('hex')}`;
    if (contentHash !== expectedHash) {
      return NextResponse.json({ error: 'Content hash does not match content' }, { status: 400 });
    }

    const ticket = verifyPostRecoveryTicket(recoveryTicket);
    if (!ticket) return NextResponse.json({ error: 'Recovery ticket is invalid or expired' }, { status: 401 });
    if (
      ticket.walletAddress.toLowerCase() !== walletAddress.toLowerCase() ||
      ticket.contentHash.toLowerCase() !== contentHash.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Recovery ticket does not match this user or content' }, { status: 403 });
    }

    if (ticket.kind === 'idea') {
      const existing = await getIdeaByTransactionHash(ticket.transactionHash);
      if (existing) {
        const matchesTicket = existing.content_hash.toLowerCase() === contentHash.toLowerCase() &&
          existing.content === content &&
          existing.submitter_wallet_address.toLowerCase() === ticket.walletAddress.toLowerCase() &&
          Number(existing.block_number) === ticket.blockNumber &&
          Number(existing.onchain_idea_id) === ticket.onchainId;
        if (!matchesTicket) {
          return NextResponse.json({ error: 'A conflicting archive record already uses this transaction' }, { status: 409 });
        }
        return NextResponse.json({ recovered: true, alreadySaved: true });
      }
    } else {
      const existing = await getResponseByTransactionHash(ticket.transactionHash);
      if (existing) {
        const responseType = ticket.responseType === 0 ? 'Support' : ticket.responseType === 1 ? 'Challenge' : 'Evidence';
        const matchesTicket = existing.content_hash.toLowerCase() === contentHash.toLowerCase() &&
          existing.content === content &&
          existing.submitter_wallet_address.toLowerCase() === ticket.walletAddress.toLowerCase() &&
          Number(existing.block_number) === ticket.blockNumber &&
          Number(existing.onchain_response_id) === ticket.onchainId &&
          existing.idea_id === ticket.ideaRecordId &&
          existing.response_type === responseType;
        if (!matchesTicket) {
          return NextResponse.json({ error: 'A conflicting archive record already uses this transaction' }, { status: 409 });
        }
        return NextResponse.json({ recovered: true, alreadySaved: true });
      }
    }

    const receipt = await getProvider().getTransactionReceipt(ticket.transactionHash);
    if (!receipt || receipt.status !== 1 || receipt.blockNumber !== ticket.blockNumber) {
      return NextResponse.json({ error: 'The original transaction could not be verified as successful' }, { status: 409 });
    }
    const transaction = await getProvider().getTransaction(ticket.transactionHash);
    if (!transaction || transaction.blockNumber !== ticket.blockNumber || transaction.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      return NextResponse.json({ error: 'The original transaction could not be verified against the contract' }, { status: 409 });
    }

    const eventName = ticket.kind === 'idea' ? 'IdeaPosted' : 'ResponsePosted';
    const matchingEvent = receipt.logs.some((log) => {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) return false;
      try {
        const event = contractInterface.parseLog(log);
        if (!event || event.name !== eventName) return false;
        if (ticket.kind === 'idea') {
          return event.args.ideaId === BigInt(ticket.onchainId) &&
            event.args.contentHash.toLowerCase() === contentHash.toLowerCase() &&
            event.args.submitter.toLowerCase() === transaction.from.toLowerCase();
        }

        return event.args.responseId === BigInt(ticket.onchainId) &&
          event.args.ideaId === BigInt(ticket.onchainIdeaId!) &&
          event.args.contentHash.toLowerCase() === contentHash.toLowerCase() &&
          event.args.responseType === BigInt(ticket.responseType!) &&
          event.args.submitter.toLowerCase() === transaction.from.toLowerCase();
      } catch {
        return false;
      }
    });

    if (!matchingEvent) {
      return NextResponse.json({ error: 'The original transaction does not match this recovery request' }, { status: 409 });
    }

    if (ticket.kind === 'idea') {
      await saveIdea({
        content_hash: contentHash,
        content,
        submitter_wallet_address: ticket.walletAddress,
        onchain_idea_id: ticket.onchainId,
        transaction_hash: ticket.transactionHash,
        block_number: ticket.blockNumber,
      });
    } else {
      const idea = await getIdeaForResponse(ticket.ideaRecordId!);
      if (Number(idea.onchain_idea_id) !== ticket.onchainIdeaId) {
        return NextResponse.json({ error: 'The response no longer matches its archive idea record' }, { status: 409 });
      }

      await saveResponse({
        idea_id: ticket.ideaRecordId!,
        content_hash: contentHash,
        content,
        response_type: ticket.responseType === 0 ? 'Support' : ticket.responseType === 1 ? 'Challenge' : 'Evidence',
        submitter_wallet_address: ticket.walletAddress,
        onchain_response_id: ticket.onchainId,
        transaction_hash: ticket.transactionHash,
        block_number: ticket.blockNumber,
      });
    }

    return NextResponse.json({ recovered: true, alreadySaved: false });
  } catch (error) {
    console.error('Failed to recover archive record from existing transaction:', error);
    return NextResponse.json({ error: 'Could not recover the archive record. The original transaction was not resubmitted.' }, { status: 500 });
  }
}
