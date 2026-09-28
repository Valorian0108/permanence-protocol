import { PrivyClient, verifyAccessToken } from '@privy-io/node';
import type { NextRequest } from 'next/server';

const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;
const verificationKey = process.env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, '\n');

let privyClient: PrivyClient | null = null;

function getPrivyClient() {
  if (!appId || !appSecret) {
    throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be configured on the server');
  }

  if (!privyClient) {
    privyClient = new PrivyClient({ appId, appSecret, jwtVerificationKey: verificationKey });
  }

  return privyClient;
}

export async function getAuthenticatedWallet(request: NextRequest): Promise<string | null> {
  if (!appId || !appSecret || !verificationKey) {
    throw new Error('Privy server credentials are not configured');
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  let claims;
  try {
    claims = await verifyAccessToken({
      access_token: match[1],
      app_id: appId,
      verification_key: verificationKey,
    });
  } catch (error) {
    console.warn(
      'Privy access-token verification failed:',
      error instanceof Error ? error.message : 'unknown verification error'
    );
    return null;
  }

  try {
    const user = await getPrivyClient().users()._get(claims.user_id);
    const accounts = user.linked_accounts;
    const wallet =
      accounts.find((account) => account.type === 'wallet' && account.chain_type === 'ethereum' && 'wallet_client_type' in account && account.wallet_client_type === 'privy') ||
      accounts.find((account) => account.type === 'wallet' && account.chain_type === 'ethereum') ||
      accounts.find((account) => account.type === 'smart_wallet');

    if (wallet && 'address' in wallet) return wallet.address;

    console.warn('Authenticated Privy user has no linked Ethereum wallet');
    return null;
  } catch (error) {
    console.error('Failed to load authenticated Privy user:', error);
    throw new Error('Unable to load the authenticated Privy user');
  }
}
