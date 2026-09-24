'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
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