'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import IdeaFeed from '../components/IdeaFeed';
import PostIdeaForm from '../components/PostIdeaForm';
import LandingAnimation from '../components/LandingAnimation';

export default function Home() {
  const { ready, authenticated, login, logout } = usePrivy();
  const [showLanding, setShowLanding] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleAnimationComplete = () => {
    setShowLanding(false);
  };

  // Get wallet address when authenticated
  useEffect(() => {
    if (authenticated && !walletAddress) {
      // For now, we'll use the backend signer address since we're using that for transactions
      // In production, this would be the user's Privy embedded wallet address
      setWalletAddress('0x87a3724BC07126751A7B6f30D90D5E8C07107863');
    }
  }, [authenticated, walletAddress]);

  if (!ready) {
    return (
      <div className="min-h-screen archive-paper flex items-center justify-center">
        <div className="archive-ink-lighter">Loading...</div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingAnimation onComplete={handleAnimationComplete} />;
  }

  return (
    <div className="min-h-screen archive-paper">
      {/* Header */}
      <header className="border-b archive-border bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold archive-display archive-ink">
              Permanence Protocol
            </h1>
            <p className="text-sm archive-ink-lighter">
              Permanent • Verifiable • Immutable
            </p>
          </div>
          {!authenticated ? (
            <button
              onClick={login}
              className="px-4 py-2 bg-ink text-white text-sm hover:bg-ink-light transition-colors"
              style={{ backgroundColor: 'var(--color-ink)' }}
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-sm archive-ink-lighter">
                <span className="archive-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 border archive-border text-sm hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {!authenticated ? (
          <div className="text-center py-16">
            <h2 className="text-3xl archive-display archive-ink mb-4">
              Ideas usually die quietly
            </h2>
            <p className="text-lg archive-ink-light mb-8" style={{ maxWidth: 'var(--measure-body)', margin: '0 auto 2rem' }}>
              Most ideas disappear into notebooks, documents, or get buried by algorithms. 
              Permanence Protocol locks ideas onchain so the conversation around an idea can never be deleted or rewritten.
            </p>
            <button
              onClick={login}
              className="px-6 py-3 text-white text-base archive-display transition-colors"
              style={{ backgroundColor: 'var(--color-ink)' }}
            >
              Enter the Archive
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <PostIdeaForm />
            <IdeaFeed />
          </div>
        )}
      </main>
    </div>
  );
}