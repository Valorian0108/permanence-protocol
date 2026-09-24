'use client';

export default function Home() {
  // TEMPORARILY DISABLE PRIVY FOR DEBUGGING
  // Show simple placeholder UI
  return (
    <div className="min-h-screen archive-paper">
      <header className="border-b archive-border bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold archive-display archive-ink">
            Permanence Protocol
          </h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center py-16">
          <h2 className="text-3xl archive-display archive-ink mb-4">
            Privy Temporarily Disabled
          </h2>
          <p className="text-lg archive-ink-light mb-8">
            Authentication is temporarily disabled for debugging.
          </p>
        </div>
      </main>
    </div>
  );
}