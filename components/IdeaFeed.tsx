'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const PAGE_SIZE = 25;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [totalIdeas, setTotalIdeas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const requestNumber = useRef(0);

  const fetchIdeas = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    setLoading(true);
    setLoadError('');
    try {
      const result = await getIdeas({ page, pageSize: PAGE_SIZE, query: searchQuery });
      if (currentRequest !== requestNumber.current) return;
      setIdeas(result.ideas);
      setTotalIdeas(result.total);
    } catch (error) {
      if (currentRequest !== requestNumber.current) return;
      console.error('Error fetching ideas:', error);
      setLoadError('The archive could not be loaded. Check your connection and try again.');
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    if (supabaseUrl) void fetchIdeas();
    else setLoading(false);
  }, [fetchIdeas, supabaseUrl]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearchQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const filteredIdeas = ideas;
  const totalPages = Math.max(1, Math.ceil(totalIdeas / PAGE_SIZE));
  const firstVisiblePage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstVisiblePage + index);
  const firstEntry = totalIdeas === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastEntry = Math.min(page * PAGE_SIZE, totalIdeas);

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
    document.getElementById('archive-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Find an idea"
            className="archive-search"
          />
        </label>
      </div>

      <div className="archive-feed-toolbar">
        <span className="archive-entry-total archive-mono">
          {searchQuery ? `${totalIdeas} MATCHING ${totalIdeas === 1 ? 'ENTRY' : 'ENTRIES'}` : `${totalIdeas} ${totalIdeas === 1 ? 'ENTRY' : 'ENTRIES'}`}
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
      ) : totalIdeas === 0 ? (
        <div className="archive-feed-state">
          <h3>{searchQuery ? 'No ideas match that search.' : 'The archive is waiting for its first entry.'}</h3>
          {!searchQuery && <p>An idea can be a question, observation, hypothesis, proposal, or tested result. It needn’t be proven to be worth sharing.</p>}
          {!searchQuery && !canPost && <button type="button" onClick={onSignIn} className="archive-button archive-button-solid">Sign in to contribute</button>}
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
          {filteredIdeas.length > 0 && (
            <div className="archive-entries">
              {filteredIdeas.map((idea, index) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={firstEntry + index - 1}
                  canPost={canPost}
                  onSignIn={onSignIn}
                />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <nav className="archive-pagination" aria-label="Archive pages">
              <button type="button" className="archive-page-step" onClick={() => changePage(page - 1)} disabled={page === 1 || loading}>
                <span aria-hidden="true">←</span> Previous
              </button>
              <div className="archive-page-list" aria-label={`Page ${page} of ${totalPages}`}>
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={`archive-page-number${pageNumber === page ? ' is-current' : ''}`}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === page ? 'page' : undefined}
                    onClick={() => changePage(pageNumber)}
                    disabled={loading}
                  >
                    {String(pageNumber).padStart(2, '0')}
                  </button>
                ))}
                <span className="archive-page-total archive-mono">/ {String(totalPages).padStart(2, '0')}</span>
              </div>
              <button type="button" className="archive-page-step" onClick={() => changePage(page + 1)} disabled={page === totalPages || loading}>
                Next <span aria-hidden="true">→</span>
              </button>
            </nav>
          )}
          {totalIdeas > 0 && <p className="archive-page-caption archive-mono">SHOWING {firstEntry}–{lastEntry} OF {totalIdeas} {searchQuery ? 'MATCHING ' : ''}{totalIdeas === 1 ? 'ENTRY' : 'ENTRIES'}</p>}
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
  const responseCount = responsesLoaded ? responses.length : idea.response_count ?? 0;
  const shortWallet = formatWalletId(idea.submitter_wallet_address);

  return (
      <article className="archive-entry">
        <div className="archive-entry-meta">
          <span className="archive-entry-number archive-mono">{String(index + 1).padStart(2, '0')}</span>
          <span className="archive-wallet-id archive-mono" aria-label={`Posted by wallet ${shortWallet}`} title="Pseudonymous wallet identifier">by {shortWallet}</span>
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
          {showResponses ? 'Close conversation' : `Conversation · ${responseCount}`}
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
                <span className="archive-wallet-id archive-mono" aria-label={`Posted by wallet ${formatWalletId(response.submitter_wallet_address)}`} title="Pseudonymous wallet identifier">by {formatWalletId(response.submitter_wallet_address)}</span>
                <time dateTime={response.timestamp}>{new Date(response.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
              </div>
              <p>{response.content}</p>
              <details className="archive-response-record-disclosure">
                <summary>Inspect response record</summary>
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
              </details>
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

function formatWalletId(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
