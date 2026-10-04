import { NextRequest, NextResponse } from 'next/server';
import { getPublicIdea } from '../../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'A valid id is required' }, { status: 400 });
  try {
    return NextResponse.json({ idea: await getPublicIdea(id) });
  } catch (error) {
    console.error('Could not load public idea:', error);
    return NextResponse.json({ error: 'Could not load idea' }, { status: 500 });
  }
}
