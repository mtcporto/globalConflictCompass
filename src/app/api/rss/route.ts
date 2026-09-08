import { NextResponse } from 'next/server';
import { fetchRssFeed, RSS_FEEDS } from '@/lib/rss';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('source') as keyof typeof RSS_FEEDS | null;
  if (!source || !(source in RSS_FEEDS)) return NextResponse.json({ status: 'error', message: 'Fonte RSS inválida.' }, { status: 400 });
  try { return NextResponse.json(await fetchRssFeed(source)); }
  catch (error) { return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : 'Falha ao buscar RSS.' }, { status: 502 }); }
}
