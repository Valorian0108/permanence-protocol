/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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