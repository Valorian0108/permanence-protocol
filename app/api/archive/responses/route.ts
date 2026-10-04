import { NextRequest, NextResponse } from 'next/server';
import { getPublicResponses } from '../../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ideaId = request.nextUrl.searchParams.get('ideaId');
  if (!ideaId || !/^[0-9a-f-]{36}$/i.test(ideaId)) {
    return NextResponse.json({ error: 'A valid ideaId is required' }, { status: 400 });
  }

  try {
    return NextResponse.json({ responses: await getPublicResponses(ideaId) });
  } catch (error) {
    console.error('Could not load public responses:', error);
    return NextResponse.json({ error: 'Could not load responses' }, { status: 500 });
  }
}
