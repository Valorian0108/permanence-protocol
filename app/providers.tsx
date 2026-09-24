'use client';

import { PrivyProvider } from '@privy-io/react-auth';

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function Providers({ children }: { children: React.ReactNode }) {
  // TEMPORARILY DISABLE PRIVY FOR DEBUGGING
  // If no Privy app ID is configured, just render children without Privy
  return <>{children}</>;

  // If no Privy app ID is configured, just render children without Privy
  if (!privyAppId) {
    return <>{children}</>;
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