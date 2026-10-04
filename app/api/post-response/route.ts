import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { BackendSigner } from '../../../lib/signer';
import { getAuthenticatedWallet } from '../../../lib/server-auth';
import { consumePostRateLimit, contributorHasNickname, getSafeIdeaForResponse, saveResponse } from '../../../lib/server-supabase';
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
    const { ideaId, content, contentHash, responseType } = body;

    if (typeof ideaId !== 'string' || typeof content !== 'string' || typeof contentHash !== 'string' || responseType === undefined) {
      return NextResponse.json(
        { error: 'ideaId, content, contentHash, and responseType are required' },
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

    // Validate responseType
    if (typeof responseType !== 'number' || ![0, 1, 2].includes(responseType)) {
      return NextResponse.json(
        { error: "responseType must be 0 (Support), 1 (Challenge), or 2 (Evidence)" },
        { status: 400 }
      );
    }

    const idea = await getSafeIdeaForResponse(ideaId);
    if (idea.onchain_idea_id === null) {
      return NextResponse.json({ error: 'Idea is not linked to an on-chain record' }, { status: 409 });
    }

    const rateLimit = await consumePostRateLimit(walletAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Post limit reached. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    console.log('Received authenticated post-response request:', { ideaId, contentHash, responseType });
    const signer = new BackendSigner();
    const result = await signer.postResponse(String(idea.onchain_idea_id), contentHash, responseType);

    if (!result.success || result.responseId == null || !result.transactionHash || result.blockNumber == null) {
      return NextResponse.json(result, { status: 502 });
    }

    try {
      await saveResponse({
        idea_id: ideaId,
        content_hash: contentHash,
        content,
        response_type: responseType === 0 ? 'Support' : responseType === 1 ? 'Challenge' : 'Evidence',
        submitter_wallet_address: walletAddress,
        onchain_response_id: Number(result.responseId),
        transaction_hash: result.transactionHash,
        block_number: Number(result.blockNumber),
      });

      return NextResponse.json({ ...result, archiveSaved: true });
    } catch (error) {
      console.error('Response transaction confirmed, but archive save failed:', error);
      return NextResponse.json({
        ...result,
        archiveSaved: false,
        recoveryTicket: createPostRecoveryTicket({
          kind: 'response',
          walletAddress,
          contentHash,
          transactionHash: result.transactionHash,
          blockNumber: Number(result.blockNumber),
          onchainId: Number(result.responseId),
          ideaRecordId: ideaId,
          onchainIdeaId: Number(idea.onchain_idea_id),
          responseType,
        }),
        warning: 'The blockchain transaction is confirmed, but the readable response could not be saved to the archive. Do not submit it again. Save the transaction hash and contact support so the archive record can be recovered.',
      });
    }
  } catch (error) {
    console.error("Error in post-response endpoint:", error);
    return NextResponse.json(
      { error: error instanceof SyntaxError ? 'Invalid JSON request body' : 'Unable to post response' },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
