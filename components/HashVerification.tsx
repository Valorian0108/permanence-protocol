'use client';

import { useState } from 'react';
import { serializeRecordV2, type RecordContext } from '../lib/record-hash';

type VerificationResult = {
  textMatches: boolean;
  chainMatches?: boolean;
  chainError?: string;
} | { error: string };

export default function HashVerification({
  content,
  expectedHash,
  kind,
  onchainId,
  recordVersion,
  recordContext,
}: {
  content: string;
  expectedHash: string;
  kind: 'idea' | 'response';
  onchainId: number | null;
  recordVersion?: number;
  recordContext?: RecordContext;
}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verify = async () => {
    setIsVerifying(true);
    setResult(null);

    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(expectedHash)) {
        setResult({ error: 'The archive value is not a valid SHA-256 hash.' });
        return;
      }
      if (onchainId === null || !Number.isSafeInteger(onchainId) || onchainId < 0) {
        setResult({ error: 'This archive entry has no valid on-chain ID to verify.' });
        return;
      }

      const hashInput = kind === 'idea' && recordVersion === 2
        ? serializeRecordV2(content, recordContext)
        : content;
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
      const actualHash = `0x${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
      const textMatches = actualHash === expectedHash.toLowerCase();
      try {
        const response = await fetch(`/api/verify-onchain?kind=${kind}&id=${onchainId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not read the on-chain hash.');

        setResult({ textMatches, chainMatches: data.contentHash === expectedHash.toLowerCase() });
      } catch (error) {
        setResult({
          textMatches,
          chainError: error instanceof Error ? error.message : 'Could not read the on-chain hash.',
        });
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Could not verify this entry.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="archive-verification mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <button
        type="button"
        onClick={verify}
        disabled={isVerifying}
        className="archive-verify-button underline archive-ink-light hover:archive-ink disabled:opacity-50"
      >
        {isVerifying ? 'Verifying…' : kind === 'idea' && recordVersion === 2 ? 'Verify record and chain' : 'Verify text and chain'}
      </button>
      {result && 'error' in result && (
        <span role="alert" className="text-red-700">{result.error}</span>
      )}
      {result && !('error' in result) && (
        <span role={result.textMatches && result.chainMatches === true ? 'status' : 'alert'} className="flex flex-wrap gap-x-3 gap-y-1">
          <span className={result.textMatches ? 'archive-verify-success' : 'archive-verify-failure'}>
            {result.textMatches
              ? kind === 'idea' && recordVersion === 2 ? 'Record matches archive hash' : 'Text matches archive hash'
              : kind === 'idea' && recordVersion === 2 ? 'Record does not match archive hash' : 'Text does not match archive hash'}
          </span>
          <span className={result.chainError ? 'archive-verify-warning' : result.chainMatches ? 'archive-verify-success' : 'archive-verify-failure'}>
            {result.chainError
              ? `On-chain check unavailable: ${result.chainError}`
              : result.chainMatches
                ? 'Archive hash matches on-chain hash'
                : 'Archive hash does not match on-chain hash'}
          </span>
        </span>
      )}
    </div>
  );
}
