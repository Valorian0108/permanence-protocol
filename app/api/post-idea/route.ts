import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { BackendSigner } from '../../../lib/signer';
import { getAuthenticatedWallet } from '../../../lib/server-auth';
import { consumePostRateLimit, contributorHasNickname, saveIdea } from '../../../lib/server-supabase';
import { createPostRecoveryTicket } from '../../../lib/post-recovery';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = await getAuthenticatedWallet(request);
    if (!walletAddress) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!await contributorHasNickname(walletAddress)) {
      return NextResponse.json({ error: 'Choose a nickname before contributing' }, { status: 428 });
    }

    const body = await request.json();
    const { content, contentHash } = body;

    if (typeof content !== 'string' || typeof contentHash !== 'string') {
      return NextResponse.json(
        { error: 'content and contentHash are required' },
        { status: 400 }
      );
    }

    if (!content.trim() || content.length > 10000) {
      return NextResponse.json({ error: 'Content must be between 1 and 10000 characters' }, { status: 400 });
    }

    const expectedHash = `0x${createHash('sha256').update(content, 'utf8').digest('hex')}`;
    if (contentHash !== expectedHash) {
      return NextResponse.json({ error: 'Content hash does not match content' }, { status: 400 });
    }

    const rateLimit = await consumePostRateLimit(walletAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Post limit reached. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    console.log('Received authenticated post-idea request:', contentHash);
    const signer = new BackendSigner();
    const result = await signer.postIdea(contentHash);

    if (!result.success || result.ideaId == null || !result.transactionHash || result.blockNumber == null) {
      return NextResponse.json(result, { status: 502 });
    }

    try {
      await saveIdea({
        content_hash: contentHash,
        content,
        submitter_wallet_address: walletAddress,
        onchain_idea_id: Number(result.ideaId),
        transaction_hash: result.transactionHash,
        block_number: Number(result.blockNumber),
      });

      return NextResponse.json({ ...result, archiveSaved: true });
    } catch (error) {
      console.error('Idea transaction confirmed, but archive save failed:', error);
      return NextResponse.json({
        ...result,
        archiveSaved: false,
        recoveryTicket: createPostRecoveryTicket({
          kind: 'idea',
          walletAddress,
          contentHash,
          transactionHash: result.transactionHash,
          blockNumber: Number(result.blockNumber),
          onchainId: Number(result.ideaId),
        }),
        warning: 'The blockchain transaction is confirmed, but the readable idea could not be saved to the archive. Do not submit it again. Save the transaction hash and contact support so the archive record can be recovered.',
      });
    }
  } catch (error) {
    console.error("Error in post-idea endpoint:", error);
    return NextResponse.json(
      { error: error instanceof SyntaxError ? 'Invalid JSON request body' : 'Unable to preserve idea' },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
