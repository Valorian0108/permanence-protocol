'use client';

import { useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { postIdea } from '../lib/backend';
import { checkDuplicateHash } from '../lib/supabase';
import { MAX_CONTEXT_FIELD_LENGTH, MAX_RECORD_CONTENT_LENGTH, RECORD_TYPES, serializeRecordV2, type RecordContext, type RecordType } from '../lib/record-hash';

export default function PostIdeaForm({ onIdeaPosted }: { onIdeaPosted: () => void }) {
  const [content, setContent] = useState('');
  const [recordType, setRecordType] = useState<RecordType | ''>('');
  const [sources, setSources] = useState('');
  const [method, setMethod] = useState('');
  const [limitations, setLimitations] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [contentHash, setContentHash] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [recoveryTicket, setRecoveryTicket] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmedIrreversible, setConfirmedIrreversible] = useState(false);
  const { authenticated, getAccessToken } = usePrivy();
  const hashRequest = useRef(0);

  // Compute SHA-256 hash in real-time
  const computeHash = async (text: string, context: RecordContext = {}) => {
    const requestId = ++hashRequest.current;
    setIsHashing(Boolean(text));
    if (!text) {
      setContentHash('');
      setDuplicateWarning(false);
      setIsHashing(false);
      return;
    }
    try {
      const encodedRecord = serializeRecordV2(text, context);
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encodedRecord));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (requestId !== hashRequest.current) return;
      setContentHash(hashHex);
      setIsHashing(false);

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) throw new Error('Sign in again to check for duplicate records.');
        const duplicate = await checkDuplicateHash(hashHex, accessToken);
        if (requestId === hashRequest.current) setDuplicateWarning(!!duplicate);
      } catch (err) {
        console.error('Error checking duplicate:', err);
      }
    } catch (err) {
      if (requestId === hashRequest.current) {
        setContentHash('');
        setIsHashing(false);
        setError('Could not compute the record hash. Please try again.');
      }
      console.error('Error computing record hash:', err);
    }
  };

  const currentContext: RecordContext = {
    recordType: recordType || null,
    sources: sources.trim() || null,
    method: method.trim() || null,
    limitations: limitations.trim() || null,
  };

  const updateContext = (field: 'recordType' | 'sources' | 'method' | 'limitations', value: string) => {
    if (field === 'recordType') setRecordType(value as RecordType | '');
    if (field === 'sources') setSources(value);
    if (field === 'method') setMethod(value);
    if (field === 'limitations') setLimitations(value);
    setConfirmedIrreversible(false);
    setError('');
    const normalizedValue = field === 'recordType' ? value || null : value.trim() || null;
    const nextContext = { ...currentContext, [field]: normalizedValue };
    void computeHash(content, nextContext);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setConfirmedIrreversible(false);
    setError('');
    computeHash(newContent, currentContext);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    if (!contentHash) {
      setError('Failed to compute content hash');
      return;
    }

    if (!authenticated) {
      setError('Please sign in to post a record');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setWarning('');
    setTransactionHash('');
    setRecoveryTicket('');

    try {
      const canonicalRecord = serializeRecordV2(content, currentContext);
      const submitDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRecord));
      const submissionHash = `0x${Array.from(new Uint8Array(submitDigest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
      setContentHash(submissionHash);
      if (submissionHash !== contentHash) throw new Error('The record changed while its hash was being computed. Please try again.');

      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Please sign in again.');

      // The authenticated API submits the transaction and stores its database record.
      const blockchainResult = await postIdea(content, submissionHash, currentContext, accessToken);
      
      if (!blockchainResult.success) {
        throw new Error('Failed to record the hash on-chain');
      }

      setTransactionHash(blockchainResult.transactionHash);

      if (blockchainResult.archiveSaved === false) {
        setRecoveryTicket(blockchainResult.recoveryTicket || '');
        setWarning(blockchainResult.warning || 'The transaction is confirmed, but the archive save needs attention. Do not submit this record again.');
        return;
      }

      setSuccess('Record saved to the archive with its hash on-chain.');
      setContent('');
      hashRequest.current += 1;
      setIsHashing(false);
      setContentHash('');
      setRecordType('');
      setSources('');
      setMethod('');
      setLimitations('');
      setShowContext(false);
      setContentHash('');
      setDuplicateWarning(false);
      setConfirmedIrreversible(false);
      onIdeaPosted();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit record. Please try again.');
      console.error('Error submitting record:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recoverArchiveSave = async () => {
    if (!recoveryTicket) return;
    setIsSubmitting(true);
    setError('');

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Sign in again to recover the archive record.');

      const response = await fetch('/api/recover-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content, contentHash, recoveryTicket, ...currentContext }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not recover the archive record.');

      setSuccess('The existing transaction has been verified and the record is now saved in the archive.');
      setWarning('');
      setRecoveryTicket('');
      setContent('');
      hashRequest.current += 1;
      setIsHashing(false);
      setContentHash('');
      setRecordType('');
      setSources('');
      setMethod('');
      setLimitations('');
      setShowContext(false);
      setContentHash('');
      setDuplicateWarning(false);
      setConfirmedIrreversible(false);
      onIdeaPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recover the archive record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="archive-post-form">
      <h2 className="archive-display archive-ink">
        Add a record
      </h2>
      <p className="archive-form-intro">Record what you have so far. Add a type or context if it helps others understand it. Optional details are hashed with the main text. The archive preserves a record; it does not certify its claims.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="content" className="block text-sm archive-ink-light mb-2">
            What would you like to record?
          </label>
          <textarea
            id="content"
            value={content}
            maxLength={MAX_RECORD_CONTENT_LENGTH}
            onChange={handleContentChange}
            placeholder="Write what you have so far…"
            className="w-full p-4 border archive-border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            style={{ 
              minHeight: '120px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-lg)',
              lineHeight: 'var(--leading-body)'
            }}
            disabled={isSubmitting || Boolean(recoveryTicket)}
          />
        </div>

        <div className="archive-record-context">
          <label htmlFor="recordType" className="block text-sm archive-ink-light mb-2">
            Record type <span className="archive-optional-label">Optional</span>
          </label>
          <select
            id="recordType"
            value={recordType}
            onChange={(event) => updateContext('recordType', event.target.value)}
            disabled={isSubmitting || Boolean(recoveryTicket)}
            className="w-full p-3 border archive-border bg-white"
          >
              <option value="">No type selected</option>
              {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>{type === 'not-sure' ? 'Not sure' : type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
          <p className="archive-context-help">Choose a label that fits, or leave it blank. These are descriptions, not quality ratings.</p>
        </div>

        <div className="archive-record-context">
          <button
            type="button"
            className="archive-text-button"
            aria-expanded={showContext}
            onClick={() => setShowContext((visible) => !visible)}
          >
            {showContext ? 'Hide optional context' : 'Add optional context'}
          </button>
          {showContext && (
            <div className="archive-context-fields">
              <p className="archive-context-help">Fill in only what is relevant. All of these details are optional. Conversation replies keep their existing Support, Challenge, and Evidence labels.</p>
              <label htmlFor="recordSources">Evidence or sources <span className="archive-optional-label">Optional</span></label>
              <textarea id="recordSources" value={sources} onChange={(event) => updateContext('sources', event.target.value)} maxLength={MAX_CONTEXT_FIELD_LENGTH} placeholder="Observations, data, references, or supporting material" disabled={isSubmitting || Boolean(recoveryTicket)} />
              <label htmlFor="recordMethod">How you reached this <span className="archive-optional-label">Optional</span></label>
              <textarea id="recordMethod" value={method} onChange={(event) => updateContext('method', event.target.value)} maxLength={MAX_CONTEXT_FIELD_LENGTH} placeholder="Approach, process, or reasoning, if applicable" disabled={isSubmitting || Boolean(recoveryTicket)} />
              <label htmlFor="recordLimitations">Limitations or open questions <span className="archive-optional-label">Optional</span></label>
              <textarea id="recordLimitations" value={limitations} onChange={(event) => updateContext('limitations', event.target.value)} maxLength={MAX_CONTEXT_FIELD_LENGTH} placeholder="Caveats, unknowns, or what remains unresolved" disabled={isSubmitting || Boolean(recoveryTicket)} />
            </div>
          )}
        </div>

        {contentHash && (
          <div className="archive-paper-dark p-4 border archive-border">
            <div className="text-sm archive-ink-light mb-2">
              Record Hash (SHA-256):
            </div>
            <code className="archive-mono archive-ink break-all" style={{ fontSize: 'var(--text-mono)' }}>
              {contentHash}
            </code>
            <div className="mt-2 text-xs archive-ink-lighter">
              The readable record is saved in the archive database. Its hash covers the main text and the optional type and context shown above.
            </div>
          </div>
        )}

        {content.trim() && (
          <label className="flex items-start gap-3 text-sm archive-ink-light">
            <input
              type="checkbox"
              checked={confirmedIrreversible}
              onChange={(event) => setConfirmedIrreversible(event.target.checked)}
              disabled={isSubmitting}
              className="mt-1"
            />
            <span>I understand that the text will be saved to the archive, only its hash is recorded on-chain, and the on-chain record cannot be removed.</span>
          </label>
        )}

        {duplicateWarning && (
          <div className="bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ A record with this hash already exists. You can still post, but this may be a duplicate.
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-700" role="status">
            {success}
            {transactionHash && (
              <> {' '}
                <a href={`https://sepolia.arbiscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  View transaction
                </a>
              </>
            )}
          </div>
        )}

        {warning && (
          <div className="space-y-2 text-sm text-amber-900" role="alert">
            <p>{warning}</p>
            {transactionHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                View confirmed transaction
              </a>
            )}
            {recoveryTicket && (
              <button type="button" onClick={recoverArchiveSave} disabled={isSubmitting} className="underline disabled:opacity-50">
                {isSubmitting ? 'Recovering archive record…' : 'Retry archive save (no new transaction)'}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!contentHash || isHashing || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)}
          className="archive-button archive-button-solid archive-submit-button archive-display disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            opacity: (!contentHash || isHashing || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)) ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Recording…' : 'Record this entry'}
        </button>
      </form>
    </div>
  );
}
