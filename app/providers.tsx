'use client';

import { PrivyProvider } from '@privy-io/react-auth';

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function Providers({ children }: { children: React.ReactNode }) {
  // Privy-dependent pages use Privy hooks, so don't render them outside the provider.
  if (!privyAppId) {
    return (
      <main className="min-h-screen archive-paper flex items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl archive-display archive-ink mb-4">
            Privy is not configured
          </h1>
          <p className="archive-ink-light">
            Add <code className="archive-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> to
            your local environment file, then restart the development server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets'
          }
        },
        // Enable only email and Google login
        loginMethods: ['email', 'google'],
        // Appearance customization
        appearance: {
          theme: 'light',
          accentColor: '#1a1a1a'
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
