'use client';

import { useState, useEffect } from 'react';
import { getIdeas, getResponsesByIdeaId, Idea, Response } from '../lib/supabase';
import PostResponseForm from './PostResponseForm';

export default function IdeaFeed() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const data = await getIdeas();
      setIdeas(data);
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="archive-ink-lighter">Loading archive...</p>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="text-center py-16 border-t archive-border mt-8">
        <p className="archive-ink-light text-lg">
          The archive is empty. Be the first to preserve an idea.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-t archive-border pt-8">
        <h2 className="text-2xl archive-display archive-ink mb-6">
          Archived Ideas
        </h2>
        <div className="space-y-6">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [showResponses, setShowResponses] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);

  const fetchResponses = async () => {
    try {
      const data = await getResponsesByIdeaId(idea.id);
      setResponses(data);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const toggleResponses = () => {
    if (!showResponses && responses.length === 0) {
      fetchResponses();
    }
    setShowResponses(!showResponses);
  };

  const handleResponsePosted = () => {
    fetchResponses();
    setShowResponseForm(false);
  };

  return (
    <article className="border archive-border bg-white p-6">
      <div className="mb-4">
        <p className="text-lg leading-relaxed archive-ink" style={{ maxWidth: 'var(--measure-body)' }}>
          {idea.content}
        </p>
      </div>

      <div className="pt-4 border-t archive-border">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="archive-ink-lighter">Content Hash:</span>
            <code className="archive-mono archive-ink-light" style={{ fontSize: 'var(--text-mono)' }}>
              {idea.content_hash}
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="archive-ink-lighter">Transaction:</span>
            <a
              href={`https://sepolia.arbiscan.io/tx/${idea.transaction_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="archive-mono archive-ink-light hover:underline"
              style={{ fontSize: 'var(--text-mono)' }}
            >
              {idea.transaction_hash.slice(0, 10)}...{idea.transaction_hash.slice(-8)}
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="archive-ink-lighter">Block:</span>
            <span className="archive-mono archive-ink-light" style={{ fontSize: 'var(--text-mono)' }}>
              {idea.block_number}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="archive-ink-lighter">Submitted:</span>
            <span className="archive-ink-light">
              {new Date(idea.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>

        <button
          onClick={toggleResponses}
          className="text-sm archive-ink-light hover:archive-ink transition-colors"
        >
          {showResponses ? `Hide ${responses.length} Responses` : `View ${responses.length} Responses`}
        </button>

        {showResponses && (
          <div className="mt-4 space-y-4">
            {responses.length === 0 ? (
              <p className="text-sm archive-ink-lighter italic">No responses yet</p>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="pl-4 border-l-2 archive-border">
                  <div className="text-sm archive-ink-light mb-1">
                    <span className="font-semibold">{response.response_type}</span>
                  </div>
                  <p className="text-base archive-ink mb-2">{response.content}</p>
                  <div className="text-xs archive-ink-lighter space-x-4">
                    <span className="archive-mono">{response.content_hash.slice(0, 10)}...</span>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${response.transaction_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View Transaction
                    </a>
                  </div>
                </div>
              ))
            )}

            {!showResponseForm && (
              <button
                onClick={() => setShowResponseForm(true)}
                className="text-sm archive-ink hover:archive-ink-light transition-colors"
              >
                + Add Response
              </button>
            )}

            {showResponseForm && (
              <PostResponseForm
                ideaId={idea.id}
                onResponsePosted={handleResponsePosted}
              />
            )}
          </div>
        )}
      </div>
    </article>
  );
}