'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import IdeaFeed from '../components/IdeaFeed';
import PostIdeaForm from '../components/PostIdeaForm';
import LandingAnimation from '../components/LandingAnimation';

export default function PrivyApp() {
  const { ready, authenticated, logout, user, getAccessToken } = usePrivy();
  const { login } = useLogin({
    onError: (error) => {
      console.error('Login error:', error);
    }
  });
  const [showLanding, setShowLanding] = useState(true);
  const [nickname, setNickname] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameCustomized, setNicknameCustomized] = useState(false);
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [archiveRevision, setArchiveRevision] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAnimationComplete = () => {
    setShowLanding(false);
  };

  useEffect(() => {
    if (!authenticated || !user) {
      setNickname('');
      setNicknameCustomized(false);
      setNicknameEditing(false);
      return;
    }

    let active = true;
    setNicknameLoading(true);
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Your session expired. Please sign in again.');
        const response = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load your nickname.');
        if (active) {
          setNickname(result.nickname ?? '');
          setNicknameInput(result.nickname ?? '');
          setNicknameCustomized(Boolean(result.nicknameCustomized));
          setNicknameEditing(!result.nicknameCustomized);
        }
      } catch (error) {
        if (active) {
          setNicknameError(error instanceof Error ? error.message : 'Could not load your nickname.');
          setNicknameEditing(true);
        }
      } finally {
        if (active) setNicknameLoading(false);
      }
    })();

    return () => { active = false; };
  }, [authenticated, user, getAccessToken]);

  const saveNickname = async (event: React.FormEvent) => {
    event.preventDefault();
    setNicknameSaving(true);
    setNicknameError('');
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: nicknameInput }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your nickname.');
      setNickname(result.nickname);
      setNicknameInput(result.nickname);
      setNicknameCustomized(true);
      setNicknameEditing(false);
      setArchiveRevision((revision) => revision + 1);
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : 'Could not save your nickname.');
    } finally {
      setNicknameSaving(false);
    }
  };

  // Show loading while Privy initializes or not mounted
  if (!mounted || !ready) {
    return (
      <div className="min-h-screen archive-paper flex items-center justify-center">
        <div className="archive-ink-lighter">Loading...</div>
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
                <span className="archive-account-wallet">{nickname || (nicknameLoading ? 'Loading nickname…' : 'Choose a nickname')}</span>
                {nickname && <button type="button" onClick={() => { setNicknameInput(nickname); setNicknameEditing(true); }} className="archive-text-button">Edit</button>}
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

        {authenticated && nicknameEditing && (
          <section className="archive-compose" aria-label="Choose your public nickname">
            <div>
              <p className="archive-eyebrow">Your public name</p>
              <h2 className="archive-display archive-ink">Choose a nickname</h2>
              <p className="archive-form-intro">Your nickname appears beside your posts and responses. No real name is required. It can be changed later; older contributions will show your current nickname. Your wallet address is omitted from the app’s public archive API and display, but may be visible in public blockchain history.</p>
              <form onSubmit={saveNickname} className="archive-nickname-form">
                <label htmlFor="contributor-nickname">Nickname</label>
                <input id="contributor-nickname" value={nicknameInput} onChange={(event) => setNicknameInput(event.target.value)} minLength={3} maxLength={24} autoComplete="nickname" required disabled={nicknameSaving || nicknameLoading} placeholder="3–24 characters" />
                {nicknameError && <p role="alert" className="archive-form-error">{nicknameError}</p>}
                <button type="submit" className="archive-button archive-button-solid" disabled={nicknameSaving || nicknameLoading}>{nicknameSaving ? 'Saving…' : nicknameCustomized ? 'Save nickname' : 'Choose nickname'}</button>
                {nicknameCustomized && <button type="button" className="archive-text-button" onClick={() => { setNicknameInput(nickname); setNicknameEditing(false); }}>Cancel</button>}
              </form>
              <p className="archive-subtle">A nickname distinguishes an account; it does not verify a real identity or one person per account.</p>
            </div>
          </section>
        )}

        {authenticated && nickname && !nicknameEditing && (
          <section className="archive-compose" aria-label="Contribute an idea">
            <PostIdeaForm onIdeaPosted={() => setArchiveRevision((revision) => revision + 1)} />
          </section>
        )}

        <IdeaFeed
          key={archiveRevision}
          canPost={authenticated && Boolean(nickname) && !nicknameEditing}
          onSignIn={() => {
            if (authenticated) {
              setNicknameInput(nickname);
              setNicknameEditing(true);
            } else {
              login();
            }
          }}
        />

        <footer className="archive-footer">
          <p>PERMANENCE PROTOCOL · PUBLIC ARCHIVE</p>
          <p>A test-network prototype. Archive availability is not guaranteed.</p>
        </footer>
      </main>
      {showLanding && <LandingAnimation onComplete={handleAnimationComplete} />}
    </div>
  );
}
