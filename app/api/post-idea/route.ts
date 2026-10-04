import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { BackendSigner } from '../../../lib/signer';
import { getAuthenticatedWallet } from '../../../lib/server-auth';
import { consumePostRateLimit, contributorHasNickname, saveIdea } from '../../../lib/server-supabase';
import { createPostRecoveryTicket } from '../../../lib/post-recovery';
import { MAX_CONTEXT_FIELD_LENGTH, MAX_RECORD_CONTENT_LENGTH, RECORD_TYPES, serializeRecordV2, type RecordContext } from '../../../lib/record-hash';

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
    const { content, contentHash, recordVersion, recordType, sources, method, limitations } = body;

    if (typeof content !== 'string' || typeof contentHash !== 'string') {
      return NextResponse.json(
        { error: 'content and contentHash are required' },
        { status: 400 }
      );
    }

    if (!content.trim() || content.length > MAX_RECORD_CONTENT_LENGTH) {
      return NextResponse.json({ error: 'Content must be between 1 and 10000 characters' }, { status: 400 });
    }

    if (recordVersion !== 2) {
      return NextResponse.json({ error: 'Unsupported record format version' }, { status: 400 });
    }

    const optionalFields: Array<[string, unknown, number]> = [
      ['sources', sources, MAX_CONTEXT_FIELD_LENGTH],
      ['method', method, MAX_CONTEXT_FIELD_LENGTH],
      ['limitations', limitations, MAX_CONTEXT_FIELD_LENGTH],
    ];
    for (const [field, value, maxLength] of optionalFields) {
      if (value !== null && value !== undefined && (typeof value !== 'string' || value.length > maxLength)) {
        return NextResponse.json({ error: `${field} must be text of at most ${maxLength} characters` }, { status: 400 });
      }
    }

    const normalizedContext: RecordContext = {
      recordType: recordType === '' || recordType == null ? null : recordType,
      sources: typeof sources === 'string' && sources.trim() ? sources.trim() : null,
      method: typeof method === 'string' && method.trim() ? method.trim() : null,
      limitations: typeof limitations === 'string' && limitations.trim() ? limitations.trim() : null,
    };
    if (normalizedContext.recordType != null && !RECORD_TYPES.includes(normalizedContext.recordType)) {
      return NextResponse.json({ error: 'Record type is not supported' }, { status: 400 });
    }

    const normalizedContent = content;
    const canonicalRecord = serializeRecordV2(normalizedContent, normalizedContext);
    const expectedHash = `0x${createHash('sha256').update(canonicalRecord, 'utf8').digest('hex')}`;
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
        content: normalizedContent,
        record_version: 2,
        record_type: normalizedContext.recordType,
        sources: normalizedContext.sources,
        method: normalizedContext.method,
        limitations: normalizedContext.limitations,
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
          recordVersion: 2,
          recordType: normalizedContext.recordType,
          sources: normalizedContext.sources,
          method: normalizedContext.method,
          limitations: normalizedContext.limitations,
        }),
        warning: 'The blockchain transaction is confirmed, but the readable record could not be saved to the archive. Do not submit it again. Save the transaction hash and contact support so the archive record can be recovered.',
      });
    }
  } catch (error) {
    console.error("Error in post-idea endpoint:", error);
    return NextResponse.json(
      { error: error instanceof SyntaxError ? 'Invalid JSON request body' : 'Unable to preserve record' },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
}
