'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { postIdea } from '../lib/backend';
import { checkDuplicateHash } from '../lib/supabase';

export default function PostIdeaForm({ onIdeaPosted }: { onIdeaPosted: () => void }) {
  const [content, setContent] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [recoveryTicket, setRecoveryTicket] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmedIrreversible, setConfirmedIrreversible] = useState(false);
  const { authenticated, getAccessToken } = usePrivy();

  // Compute SHA-256 hash in real-time
  const computeHash = async (text: string) => {
    if (!text) {
      setContentHash('');
      setDuplicateWarning(false);
      return;
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setContentHash(hashHex);
    
    // Check for duplicates
    try {
      const duplicate = await checkDuplicateHash(hashHex);
      setDuplicateWarning(!!duplicate);
    } catch (err) {
      console.error('Error checking duplicate:', err);
    }
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
      setError('Please sign in to post an idea');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    setWarning('');
    setTransactionHash('');
    setRecoveryTicket('');

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Your session expired. Please sign in again.');

      // The authenticated API submits the transaction and stores its database record.
      const blockchainResult = await postIdea(content, contentHash, accessToken);
      
      if (!blockchainResult.success) {
        throw new Error('Failed to submit to blockchain');
      }

      setTransactionHash(blockchainResult.transactionHash);

      if (blockchainResult.archiveSaved === false) {
        setRecoveryTicket(blockchainResult.recoveryTicket || '');
        setWarning(blockchainResult.warning || 'The transaction is confirmed, but the archive save needs attention. Do not submit this idea again.');
        return;
      }

      setSuccess('Idea recorded on-chain and saved to the archive.');
      setContent('');
      setContentHash('');
      setDuplicateWarning(false);
      setConfirmedIrreversible(false);
      onIdeaPosted();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit idea. Please try again.');
      console.error('Error submitting idea:', err);
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

      setSuccess('The existing transaction has been verified and the idea is now saved in the archive.');
      setWarning('');
      setRecoveryTicket('');
      setContent('');
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
        Add a first thought
      </h2>
      <p className="archive-form-intro">A question, observation, hypothesis, proposal, or tested result can all be worth sharing. The archive keeps the original words; it does not certify that they are true.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="content" className="block text-sm archive-ink-light mb-2">
            What would you like to preserve?
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            placeholder="Start with a question, an observation, or a possibility…"
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

        {contentHash && (
          <div className="archive-paper-dark p-4 border archive-border">
            <div className="text-sm archive-ink-light mb-2">
              Content Hash (SHA-256):
            </div>
            <code className="archive-mono archive-ink break-all" style={{ fontSize: 'var(--text-mono)' }}>
              {contentHash}
            </code>
            <div className="mt-2 text-xs archive-ink-lighter">
              The readable text is saved in the archive database. Only this SHA-256 hash is recorded on Arbitrum Sepolia.
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
              ⚠️ An idea with this content hash already exists. You can still post, but this may be a duplicate.
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
          disabled={!contentHash || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)}
          className="archive-button archive-button-solid archive-submit-button archive-display disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            opacity: (!contentHash || !confirmedIrreversible || isSubmitting || Boolean(recoveryTicket)) ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Recording…' : 'Record this idea'}
        </button>
      </form>
    </div>
  );
}
