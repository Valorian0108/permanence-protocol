'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { postResponse } from '../lib/backend';
import { insertResponse, getIdeaById } from '../lib/supabase';

interface PostResponseFormProps {
  ideaId: string;
  onResponsePosted: () => void;
}

type ResponseType = 'Support' | 'Challenge' | 'Evidence';

export default function PostResponseForm({ ideaId, onResponsePosted }: PostResponseFormProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [content, setContent] = useState('');
  const [contentHash, setContentHash] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('Support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  // If Privy is not configured, don't render the form
  if (!privyAppId) {
    return null;
  }

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
      setError('Please sign in to post a response');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Get the on-chain idea ID from Supabase
      const ideaData = await getIdeaById(ideaId);
      const onchainIdeaId = ideaData.onchain_idea_id;

      if (onchainIdeaId === null) {
        throw new Error('Idea not found on blockchain');
      }

      // Convert response type to number (0=Support, 1=Challenge, 2=Evidence)
      const responseTypeNumber = responseType === 'Support' ? 0 : responseType === 'Challenge' ? 1 : 2;

      // Step 1: Submit to backend signer (blockchain) - use on-chain ID
      const blockchainResult = await postResponse(onchainIdeaId.toString(), contentHash, responseTypeNumber);
      
      if (!blockchainResult.success) {
        throw new Error('Failed to submit to blockchain');
      }

      // Step 2: Store in Supabase
      await insertResponse({
        idea_id: ideaId,
        content_hash: contentHash,
        content: content,
        response_type: responseType,
        submitter_wallet_address: walletAddress,
        onchain_response_id: parseInt(blockchainResult.responseId),
        transaction_hash: blockchainResult.transactionHash,
        block_number: parseInt(blockchainResult.blockNumber),
      });

      setSuccess(`Response posted! Transaction: ${blockchainResult.transactionHash.slice(0, 10)}...${blockchainResult.transactionHash.slice(-8)}`);
      
      // Clear form on success
      setContent('');
      setContentHash('');
      
      // Notify parent to refresh
      onResponsePosted();
    } catch (err) {
      setError('Failed to post response. Please try again.');
      console.error('Error posting response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t archive-border pt-6 mt-6">
      <h3 className="text-lg archive-display archive-ink mb-4">
        Respond to this Idea
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="responseType" className="block text-sm archive-ink-light mb-2">
            Response Type
          </label>
          <select
            id="responseType"
            value={responseType}
            onChange={(e) => setResponseType(e.target.value as ResponseType)}
            className="w-full p-3 border archive-border bg-white focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            disabled={isSubmitting}
          >
            <option value="Support">Support</option>
            <option value="Challenge">Challenge</option>
            <option value="Evidence">Evidence</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm archive-ink-light mb-2">
            Your Response
          </label>
          <textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            placeholder="Provide your support, challenge, or evidence..."
            className="w-full p-4 border archive-border bg-white resize-none focus:outline-none focus:ring-1 focus:ring-ink transition-all"
            style={{ 
              minHeight: '100px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-body)',
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
          {isSubmitting ? 'Posting...' : 'Post Response'}
        </button>
      </form>
    </div>
  );
}