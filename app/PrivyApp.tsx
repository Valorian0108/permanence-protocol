'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import IdeaFeed from '../components/IdeaFeed';
import PostIdeaForm from '../components/PostIdeaForm';
import LandingAnimation from '../components/LandingAnimation';

export default function PrivyApp() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { login } = useLogin({
    onError: (error) => {
      console.error('Login error:', error);
    }
  });
  const [showLanding, setShowLanding] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [privyError, setPrivyError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [archiveRevision, setArchiveRevision] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnimationComplete = () => {
    setShowLanding(false);
  };

  // Get wallet address when authenticated
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

  // Show loading while Privy initializes or not mounted
  if (!mounted || !ready) {
    return (
      <div className="min-h-screen archive-paper flex items-center justify-center">
        <div className="archive-ink-lighter">Loading...</div>
      </div>
    );
  }

  // Show error if Privy failed
  if (privyError) {
    return (
      <div className="min-h-screen archive-paper">
      <header className="archive-header">
          <div className="archive-shell archive-header-inner">
            <h1 className="text-2xl font-semibold archive-display archive-ink">
              Permanence Protocol
            </h1>
          </div>
        </header>
        <main className="archive-shell archive-main">
          <div className="text-center py-16">
            <h2 className="text-3xl archive-display archive-ink mb-4">
              Authentication Error
            </h2>
            <p className="text-lg archive-ink-light mb-8">
              {privyError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-white text-base archive-display transition-colors"
              style={{ backgroundColor: 'var(--color-ink)' }}
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen archive-paper">
      {/* Header */}
      <header className="archive-header">
        <div className="archive-shell archive-header-inner">
          <a className="archive-brand" href="#top" aria-label="Permanence Protocol home">
            <img className="archive-brand-mark" src="/permanence-mark.svg" alt="" aria-hidden="true" />
            <span>
              <span className="archive-brand-name">Permanence Protocol</span>
              <span className="archive-brand-caption">An archive for ideas</span>
            </span>
          </a>
          <nav className="archive-nav" aria-label="Main navigation">
            <a href="#archive">The archive</a>
            <a href="#why-share">Why preserve an idea?</a>
            {!authenticated ? (
              <button
                onClick={() => login()}
                className="archive-button archive-button-outline"
              >
                Sign in to contribute
              </button>
            ) : (
              <div className="archive-account">
                <span className="archive-account-wallet archive-mono">{walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}</span>
                <button
                  onClick={logout}
                  className="archive-button archive-button-outline"
                >
                  Sign out
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="archive-shell archive-main">
        <section className="archive-intro" aria-labelledby="archive-intro-title">
          <div className="archive-intro-copy">
            <p className="archive-eyebrow">A public reading room</p>
            <h1 id="archive-intro-title">An idea is a beginning.<br /><span>Keep the first words.</span></h1>
            <p className="archive-lede">Read ideas as they were written. Follow the responses. And, when you want to, check the record for yourself.</p>
          </div>
          <aside className="archive-principle" id="why-share">
            <p className="archive-eyebrow">Why preserve an idea?</p>
            <h3>An idea doesn’t have to be proven to be worth preserving.</h3>
            <p>Record a question, observation, hypothesis, proposal, or tested result. Others can respond and build on it. The archive preserves what was said; it doesn’t certify that it’s true.</p>
          </aside>
        </section>

        <section className="archive-explainer" aria-label="How this archive works">
          <span className="archive-status-dot" aria-hidden="true" />
          <p><strong>The words live in the archive.</strong> A hash is recorded on Arbitrum Sepolia and can be checked against the text.</p>
          <span className="archive-network archive-mono">TEST NETWORK</span>
        </section>

        {authenticated && (
          <section className="archive-compose" aria-label="Contribute an idea">
            <PostIdeaForm onIdeaPosted={() => setArchiveRevision((revision) => revision + 1)} />
          </section>
        )}

        <IdeaFeed key={archiveRevision} canPost={authenticated} onSignIn={() => login()} />

        <footer className="archive-footer">
          <p>PERMANENCE PROTOCOL · PUBLIC ARCHIVE</p>
          <p>A test-network prototype. Archive availability is not guaranteed.</p>
        </footer>
      </main>
      {showLanding && <LandingAnimation onComplete={handleAnimationComplete} />}
    </div>
  );
}
