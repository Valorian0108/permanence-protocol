import { createHmac, timingSafeEqual } from 'crypto';

export type PostRecoveryPayload = {
  version: 1;
  kind: 'idea' | 'response';
  walletAddress: string;
  contentHash: string;
  transactionHash: string;
  blockNumber: number;
  onchainId: number;
  ideaRecordId?: string;
  onchainIdeaId?: number;
  responseType?: number;
  recordVersion?: 2;
  recordType?: string | null;
  sources?: string | null;
  method?: string | null;
  limitations?: string | null;
  expiresAt: number;
};

function getRecoverySecret() {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) throw new Error('Privy server secret is required to sign post-recovery tickets');
  return createHmac('sha256', secret).update('permanence-post-recovery-v1').digest();
}

export function createPostRecoveryTicket(
  payload: Omit<PostRecoveryPayload, 'version' | 'expiresAt'>
) {
  const completePayload: PostRecoveryPayload = {
    ...payload,
    version: 1,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(completePayload)).toString('base64url');
  const signature = createHmac('sha256', getRecoverySecret()).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifyPostRecoveryTicket(ticket: string): PostRecoveryPayload | null {
  const [encodedPayload, providedSignature, extra] = ticket.split('.');
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = createHmac('sha256', getRecoverySecret())
    .update(encodedPayload)
    .digest();
  let receivedSignature: Buffer;
  try {
    receivedSignature = Buffer.from(providedSignature, 'base64url');
  } catch {
    return null;
  }

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as PostRecoveryPayload;
    if (
      payload.version !== 1 ||
      !['idea', 'response'].includes(payload.kind) ||
      typeof payload.walletAddress !== 'string' ||
      typeof payload.contentHash !== 'string' ||
      typeof payload.transactionHash !== 'string' ||
      !/^0x[a-fA-F0-9]{64}$/.test(payload.contentHash) ||
      !/^0x[a-fA-F0-9]{64}$/.test(payload.transactionHash) ||
      !Number.isSafeInteger(payload.blockNumber) ||
      !Number.isSafeInteger(payload.onchainId) ||
      !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }
    if (payload.kind === 'response' && (
      typeof payload.ideaRecordId !== 'string' ||
      !Number.isSafeInteger(payload.onchainIdeaId) ||
      ![0, 1, 2].includes(payload.responseType ?? -1)
    )) return null;
    if (payload.kind === 'idea' && payload.recordVersion !== undefined && payload.recordVersion !== 2) return null;
    return payload;
  } catch {
    return null;
  }
}
