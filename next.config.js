/** @type {import('next').NextConfig} */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
})();

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.privy.io https://*.privyusercontent.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              `connect-src 'self' ${supabaseOrigin || ''} https://*.privy.io https://*.privyusercontent.com https://explorer-api.walletconnect.com https://relay.walletconnect.com wss://relay.walletconnect.com`,
              "frame-src 'self' https://*.privy.io https://*.privyusercontent.com",
            ].join('; ')
          }
        ]
      }
    ]
  },
  webpack: (config) => {
    // Exclude Solana peer dependencies since we only use Ethereum
    config.externals = config.externals || {};
    config.externals['@solana/kit'] = 'commonjs @solana/kit';
    config.externals['@solana-program/memo'] = 'commonjs @solana-program/memo';
    config.externals['@solana-program/system'] = 'commonjs @solana-program/system';
    config.externals['@solana-program/token'] = 'commonjs @solana-program/token';
    
    // Alias Farcaster dependencies to false since we don't use them
    // Privy lazy-imports these only in Farcaster mini-app context
    config.resolve.alias['@farcaster/mini-app-solana'] = false;
    config.resolve.alias['@farcaster/miniapp-sdk'] = false;
    
    return config;
  }
}

module.exports = nextConfig
