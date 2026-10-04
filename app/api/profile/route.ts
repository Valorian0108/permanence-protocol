import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedWallet } from '../../../lib/server-auth';
import { getContributorNickname, saveContributorNickname } from '../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const wallet = await getAuthenticatedWallet(request);
    if (!wallet) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const profile = await getContributorNickname(wallet);
    return NextResponse.json({ nickname: profile?.nickname ?? null, nicknameCustomized: profile?.nickname_customized ?? false });
  } catch (error) {
    console.error('Could not load contributor profile:', error);
    return NextResponse.json({ error: 'Could not load your contributor profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const wallet = await getAuthenticatedWallet(request);
    if (!wallet) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const body = await request.json();
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim().replace(/\s+/g, ' ') : '';

    if (nickname.length < 3 || nickname.length > 24 || !/^[A-Za-z0-9 _-]+$/.test(nickname)) {
      return NextResponse.json({ error: 'Use 3–24 characters: letters, numbers, spaces, underscores, or hyphens.' }, { status: 400 });
    }

    const profile = await saveContributorNickname(wallet, nickname);
    return NextResponse.json({ nickname: profile.nickname, nicknameCustomized: profile.nickname_customized });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === '23505') return NextResponse.json({ error: 'That nickname is already in use. Try another.' }, { status: 409 });
    console.error('Could not save contributor nickname:', error);
    return NextResponse.json({ error: 'Could not save your nickname' }, { status: 500 });
  }
}
