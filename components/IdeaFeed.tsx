'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getIdeas, getResponsesByIdeaId, Idea, Response } from '../lib/supabase';
import PostResponseForm from './PostResponseForm';
import HashVerification from './HashVerification';

export default function IdeaFeed({
  canPost,
  onSignIn,
}: {
  canPost: boolean;
  onSignIn: () => void;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getIdeas();
      setIdeas(data);
    } catch (error) {
      console.error('Error fetching ideas:', error);
      setLoadError('The archive could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseUrl) void fetchIdeas();
    else setLoading(false);
  }, [fetchIdeas, supabaseUrl]);

  const filteredIdeas = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return ideas.filter((idea) => {
      const matchesQuery = !normalizedQuery || idea.content.toLocaleLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [ideas, query]);

  if (!supabaseUrl) return null;

  return (
    <section className="archive-feed" id="archive" aria-labelledby="archive-title">
      <div className="archive-feed-heading">
        <div>
          <p className="archive-eyebrow">The collection</p>
          <h2 id="archive-title">Ideas, in their own words</h2>
        </div>
        <label className="archive-search-label">
          <span className="sr-only">Search archived ideas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an idea"
            className="archive-search"
          />
        </label>
      </div>

      <div className="archive-feed-toolbar">
        <span className="archive-entry-total archive-mono">
          {query.trim() ? `${filteredIdeas.length} MATCHING ${filteredIdeas.length === 1 ? 'ENTRY' : 'ENTRIES'}` : `${ideas.length} ${ideas.length === 1 ? 'ENTRY' : 'ENTRIES'}`}
        </span>
        <span className="archive-read-note archive-mono">PUBLIC TO READ · SIGN-IN TO CONTRIBUTE</span>
      </div>

      {loading ? (
        <p className="archive-feed-state" role="status">Opening the archive…</p>
      ) : loadError && ideas.length === 0 ? (
        <div className="archive-feed-state" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={fetchIdeas} className="archive-text-button">Try again</button>
        </div>
      ) : ideas.length === 0 ? (
        <div className="archive-feed-state">
          <h3>The archive is waiting for its first entry.</h3>
          <p>An idea can be a question, observation, hypothesis, proposal, or tested result. It needn’t be proven to be worth sharing.</p>
          {!canPost && <button type="button" onClick={onSignIn} className="archive-button archive-button-solid">Sign in to contribute</button>}
        </div>
      ) : (
        <>
          {loadError && (
            <div className="archive-inline-alert" role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={fetchIdeas} disabled={loading} className="archive-text-button">
                {loading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}
          {filteredIdeas.length === 0 ? (
            <p className="archive-feed-state" role="status">No ideas match that search.</p>
          ) : (
            <div className="archive-entries">
              {filteredIdeas.map((idea, index) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={index}
                  canPost={canPost}
                  onSignIn={onSignIn}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function IdeaCard({
  idea,
  index,
  canPost,
  onSignIn,
}: {
  idea: Idea;
  index: number;
  canPost: boolean;
  onSignIn: () => void;
}) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [showResponses, setShowResponses] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesError, setResponsesError] = useState('');
  const [responsesLoaded, setResponsesLoaded] = useState(false);

  const fetchResponses = async () => {
    setResponsesLoading(true);
    setResponsesError('');
    try {
      const data = await getResponsesByIdeaId(idea.id);
      setResponses(data);
      setResponsesLoaded(true);
    } catch (error) {
      console.error('Error fetching responses:', error);
      setResponsesError('Responses could not be loaded. Please try again.');
    } finally {
      setResponsesLoading(false);
    }
  };

  const toggleResponses = () => {
    if (!showResponses && !responsesLoaded) void fetchResponses();
    setShowResponses(!showResponses);
  };

  const handleResponsePosted = () => {
    void fetchResponses();
    setShowResponseForm(false);
  };

  return (
    <article className="archive-entry">
      <div className="archive-entry-meta">
        <span className="archive-entry-number archive-mono">{String(index + 1).padStart(2, '0')}</span>
        <span className="archive-entry-type">Idea</span>
        <time className="archive-entry-date" dateTime={idea.timestamp}>{new Date(idea.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      </div>

      <p className="archive-entry-content">{idea.content}</p>

      <div className="archive-entry-actions">
        <button
          type="button"
          onClick={toggleResponses}
          aria-expanded={showResponses}
          className="archive-text-button"
        >
          {showResponses ? 'Close conversation' : 'Read the conversation'}
        </button>
        <button
          type="button"
          onClick={() => setShowRecord(!showRecord)}
          aria-expanded={showRecord}
          className="archive-text-button"
        >
          {showRecord ? 'Hide record details' : 'Inspect record'}
        </button>
      </div>

      {showRecord && (
        <div className="archive-record-panel">
          <div className="archive-record-intro">
            <span className="archive-eyebrow">Record details</span>
            <p>Readable text is stored in the archive database. Its SHA-256 hash is recorded on Arbitrum Sepolia.</p>
          </div>
          <HashVerification
            content={idea.content}
            expectedHash={idea.content_hash}
            kind="idea"
            onchainId={idea.onchain_idea_id}
          />
          <dl className="archive-record-grid">
            <div className="archive-record-field archive-record-hash">
              <dt>Archive hash · SHA-256</dt>
              <dd><code>{idea.content_hash}</code></dd>
            </div>
            <div className="archive-record-field">
              <dt>Transaction</dt>
              <dd><a href={`https://sepolia.arbiscan.io/tx/${idea.transaction_hash}`} target="_blank" rel="noopener noreferrer">{idea.transaction_hash.slice(0, 10)}…{idea.transaction_hash.slice(-8)} <span aria-hidden="true">↗</span></a></dd>
            </div>
            <div className="archive-record-field">
              <dt>Block</dt>
              <dd>{idea.block_number ?? 'Not available'}</dd>
            </div>
            <div className="archive-record-field">
              <dt>Network</dt>
              <dd>Arbitrum Sepolia · Testnet</dd>
            </div>
          </dl>
        </div>
      )}

      {showResponses && (
        <div className="archive-conversation">
          <div className="archive-conversation-heading">
            <span className="archive-eyebrow">The conversation</span>
            {responsesLoaded && <span className="archive-mono archive-response-count">{responses.length} {responses.length === 1 ? 'RESPONSE' : 'RESPONSES'}</span>}
          </div>
          {responsesLoading && <p className="archive-subtle" role="status">Loading responses…</p>}
          {responsesError && (
            <div className="archive-inline-alert" role="alert">
              <p>{responsesError}</p>
              <button type="button" onClick={() => void fetchResponses()} className="archive-text-button" disabled={responsesLoading}>
                {responsesLoading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          )}
          {responsesLoaded && !responsesError && responses.length === 0 && <p className="archive-subtle">No responses yet. The conversation can start here.</p>}
          {responses.map((response) => (
            <article key={response.id} className="archive-response">
              <div className="archive-response-meta">
                <span className={`archive-response-type archive-response-${response.response_type.toLowerCase()}`}>{response.response_type}</span>
                <time dateTime={response.timestamp}>{new Date(response.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
              </div>
              <p>{response.content}</p>
              <div className="archive-response-record">
                <code>{response.content_hash.slice(0, 12)}…</code>
                <a href={`https://sepolia.arbiscan.io/tx/${response.transaction_hash}`} target="_blank" rel="noopener noreferrer">View transaction <span aria-hidden="true">↗</span></a>
              </div>
              <HashVerification
                content={response.content}
                expectedHash={response.content_hash}
                kind="response"
                onchainId={response.onchain_response_id}
              />
            </article>
          ))}
          {!showResponseForm && canPost && (
            <button type="button" onClick={() => setShowResponseForm(true)} className="archive-button archive-button-outline archive-respond-button">Add a response</button>
          )}
          {!showResponseForm && !canPost && (
            <button type="button" onClick={onSignIn} className="archive-text-button archive-signin-response">Sign in to respond</button>
          )}
          {showResponseForm && <PostResponseForm ideaId={idea.id} onResponsePosted={handleResponsePosted} />}
        </div>
      )}
    </article>
  );
}
