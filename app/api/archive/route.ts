import { NextRequest, NextResponse } from 'next/server';
import { getPublicIdeas } from '../../../lib/server-supabase';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Math.min(10000, Number.parseInt(params.get('page') ?? '1', 10) || 1));
    const pageSize = Math.max(1, Math.min(50, Number.parseInt(params.get('pageSize') ?? '25', 10) || 25));
    const query = (params.get('query') ?? '').slice(0, 200);
    const archive = await getPublicIdeas({ page, pageSize, query });
    return NextResponse.json(archive, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Could not load public archive:', error);
    return NextResponse.json({ error: 'Could not load archive' }, { status: 500 });
  }
}
