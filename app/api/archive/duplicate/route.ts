import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedWallet } from '../../../../lib/server-auth';
import { hasDuplicateIdeaHash } from '../../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const wallet = await getAuthenticatedWallet(request);
  if (!wallet) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const hash = request.nextUrl.searchParams.get('hash') ?? '';
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) return NextResponse.json({ error: 'A valid SHA-256 hash is required' }, { status: 400 });
  try {
    return NextResponse.json({ duplicate: await hasDuplicateIdeaHash(hash) });
  } catch (error) {
    console.error('Could not check duplicate record:', error);
    return NextResponse.json({ error: 'Could not check for duplicates' }, { status: 500 });
  }
}
