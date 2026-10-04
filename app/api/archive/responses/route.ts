import { NextRequest, NextResponse } from 'next/server';
import { getPublicResponses } from '../../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const recordId = request.nextUrl.searchParams.get('recordId');
  if (!recordId || !/^[0-9a-f-]{36}$/i.test(recordId)) {
    return NextResponse.json({ error: 'A valid recordId is required' }, { status: 400 });
  }

  try {
    return NextResponse.json({ responses: await getPublicResponses(recordId) }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Could not load public responses:', error);
    return NextResponse.json({ error: 'Could not load responses' }, { status: 500 });
  }
}
