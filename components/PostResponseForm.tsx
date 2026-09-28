'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { postResponse } from '../lib/backend';

interface PostResponseFormProps {
  ideaId: string;
  onResponsePosted: () => void;
}

type ResponseType = 'Support' | 'Challenge' | 'Evidence';

export default function PostResponseForm({ ideaId, onResponsePosted }: PostResponseFormProps) {
  const [content, setContent] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('Support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [recoveryTicket, setRecoveryTicket] = useState('');
  const [confirmedIrreversible, setConfirmedIrreversible] = useState(false);
  const { authenticated, getAccessToken } = usePrivy();

  // Compute SHA-256 hash in real-time
  const computeHash = async (text: string) => {
    if (!text) {
      setContentHash('');
      return;
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setContentHash(hashHex);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setConfirmedIrreversible(false);
    computeHash(newContent);
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
      setError('Please sign in to post a response');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setWarning('');
    setTransactionHash('');
    setRecoveryTicket('');

    try {
      // Convert response type to number (0=Support, 1=Challenge, 2=Evidence)
      const responseTypeNumber = responseType === 'Support' ? 0 : responseType === 'Challenge' ? 1 : 2;

      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Please sign in again.');

      // The authenticated API resolves the on-chain ID and stores the database record.
      const blockchainResult = await postResponse(ideaId, content, contentHash, responseTypeNumber, accessToken);
      
      if (!blockchainResult.success) {
        throw new Error('Failed to submit to blockchain');
      }

      setTransactionHash(blockchainResult.transactionHash);

      if (blockchainResult.archiveSaved === false) {
        setRecoveryTicket(blockchainResult.recoveryTicket || '');
        setWarning(blockchainResult.warning || 'The transaction is confirmed, but the archive save needs attention. Do not submit this response again.');
        return;
      }

      setSuccess('Response recorded on-chain and saved to the archive.');
      setContent('');
      setContentHash('');
      setConfirmedIrreversible(false);
      
      // Notify parent to refresh
      onResponsePosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post response. Please try again.');
      console.error('Error posting response:', err);
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
        body: JSON.stringify({ content, contentHash, recoveryTicket }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not recover the archive record.');

      setSuccess('The existing transaction has been verified and the response is now saved in the archive.');
      setWarning('');
      setRecoveryTicket('');
      setContent('');
      setContentHash('');
      setConfirmedIrreversible(false);
      onResponsePosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recover the archive record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="archive-response-form">
      <h3 className="archive-display archive-ink">
        Add to the conversation
      </h3>
      <p className="archive-form-intro">Offer support, a challenge, or evidence. Responses add to the record; they don’t rewrite the original idea.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="mb-2 block text-sm archive-ink-light" id="responseType-label">
            Response type
          </span>
          <div className="archive-response-type-picker" role="radiogroup" aria-labelledby="responseType-label">
            {([
              { value: 'Support', description: 'Add agreement or nuance' },
              { value: 'Challenge', description: 'Question or counterpoint' },
              { value: 'Evidence', description: 'Share sources or observations' },
            ] as const).map(({ value, description }, index, options) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={responseType === value}
                tabIndex={responseType === value ? 0 : -1}
                disabled={isSubmitting || Boolean(recoveryTicket)}
                className={`archive-response-type-option${responseType === value ? ' is-selected' : ''}`}
                onClick={() => setResponseType(value)}
                onKeyDown={(event) => {
                  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
                  event.preventDefault();
                  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
                  const nextIndex = (index + direction + options.length) % options.length;
                  const nextType = options[nextIndex].value;
                  setResponseType(nextType);
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
                }}
              >
                <span className="archive-response-type-option-name">{value}</span>
                <span className="archive-response-type-option-description">{description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
            <label htmlFor="content" className="block text-sm archive-ink-light mb-2">
            Your response
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            placeholder="What would you add to this conversation?"
            className="w-full p-4 border archive-border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            style={{ 
              minHeight: '100px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body)',
              lineHeight: 'var(--leading-body)'
            }}
            disabled={isSubmitting || Boolean(recoveryTicket)}
          />
        </div>

        {contentHash && (
          <div className="archive-paper-dark p-4 border archive-border">
            <div className="text-sm archive-ink-light mb-2">
              Content Hash (SHA-256):
            </div>
            <code className="archive-mono archive-ink break-all" style={{ fontSize: 'var(--text-mono)' }}>
            {contentHash}
            </code>
            <div className="mt-2 text-xs archive-ink-lighter">
              The readable response is saved in the archive database. Only this SHA-256 hash is recorded on Arbitrum Sepolia.
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
            <span>I understand that the response will be saved to the archive, only its hash is recorded on-chain, and the on-chain record cannot be removed.</span>
          </label>
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
          disabled={!contentHash || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)}
          className="archive-button archive-button-solid archive-submit-button archive-display disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            opacity: (!contentHash || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)) ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Recording…' : 'Add response'}
        </button>
      </form>
    </div>
  );
}
