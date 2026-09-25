'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { postIdea } from '../lib/backend';
import { insertIdea, checkDuplicateHash } from '../lib/supabase';

export default function PostIdeaForm() {
  const [content, setContent] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { authenticated, user } = usePrivy();

  useEffect(() => {
    if (authenticated && user) {
      const wallet = user.linkedAccounts.find((account: any) => 
        account.type === 'wallet' || account.type === 'smart_wallet'
      ) as any;
      if (wallet && wallet.address) {
        setWalletAddress(wallet.address);
      }
    }
  }, [authenticated, user]);

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

    if (!walletAddress) {
      setError('Please sign in to post an idea');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Submit to backend signer (blockchain)
      const blockchainResult = await postIdea(contentHash);
      
      if (!blockchainResult.success) {
        throw new Error('Failed to submit to blockchain');
      }

      // Step 2: Store in Supabase
      await insertIdea({
        content_hash: contentHash,
        content: content,
        submitter_wallet_address: walletAddress,
        onchain_idea_id: parseInt(blockchainResult.ideaId),
        transaction_hash: blockchainResult.transactionHash,
        block_number: parseInt(blockchainResult.blockNumber),
      });

      setSuccess(`Idea preserved! Transaction: ${blockchainResult.transactionHash.slice(0, 10)}...${blockchainResult.transactionHash.slice(-8)}`);
      
      // Clear form on success
      setContent('');
      setContentHash('');
      setDuplicateWarning(false);
      
      // Refresh the idea feed
      window.location.reload();
    } catch (err) {
      setError('Failed to submit idea. Please try again.');
      console.error('Error submitting idea:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-b archive-border pb-8">
      <h2 className="text-2xl archive-display archive-ink mb-6">
        Preserve an Idea
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="content" className="block text-sm archive-ink-light mb-2">
            Your Idea
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            placeholder="Write your idea here. This will be permanently stored on the blockchain..."
            className="w-full p-4 border archive-border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            style={{ 
              minHeight: '120px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body-lg)',
              lineHeight: 'var(--leading-body)'
            }}
            disabled={isSubmitting}
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
              This hash will be permanently stored on Arbitrum Sepolia
            </div>
          </div>
        )}

        {duplicateWarning && (
          <div className="bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ An idea with this content hash already exists. You can still post, but this may be a duplicate.
            </p>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={!contentHash || isSubmitting}
          className="px-6 py-3 text-white text-base archive-display transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: 'var(--color-ink)',
            opacity: (!contentHash || isSubmitting) ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Preserving...' : 'Preserve Idea'}
        </button>
      </form>
    </div>
  );
}