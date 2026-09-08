import { NextResponse } from 'next/server';
import { extractWikipediaConflicts } from '@/ai/flows/extract-wikipedia-conflicts-flow';
import type { WikipediaConflictsData } from '@/lib/types';
import { getConflictSnapshot, saveConflictSnapshot } from '@/lib/conflict-cache';

export const runtime = 'nodejs';
export const revalidate = 21600;

const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();
const genericLocations = new Set(['africa', 'asia', 'europe', 'north america', 'south america', 'global', 'world']);

async function geocodeConflicts(data: WikipediaConflictsData) {
  const conflicts = await Promise.all(data.conflicts.map(async conflict => {
    if (typeof conflict.latitude === 'number' && typeof conflict.longitude === 'number') return conflict;
    const query = conflict.locations?.find(location => !genericLocations.has(location.trim().toLowerCase()));
    if (!query) return conflict;
    let point = geocodeCache.get(query);
    if (point === undefined) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
          headers: { 'user-agent': 'GlobalConflictCompass/1.0 (educational project)' },
          next: { revalidate: 86400 },
        });
        const result = await response.json() as Array<{ lat?: string; lon?: string }>;
        const first = result[0];
        point = first?.lat && first.lon ? { latitude: Number(first.lat), longitude: Number(first.lon) } : null;
      } catch { point = null; }
      geocodeCache.set(query, point);
    }
    return point ? { ...conflict, latitude: point.latitude, longitude: point.longitude } : conflict;
  }));
  return { ...data, conflicts };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const forceRefresh = requestUrl.searchParams.get('refresh') === '1';
  try {
    const cached = await getConflictSnapshot();
    if (cached && !forceRefresh) {
      return NextResponse.json({ ...cached.data, cached: true, cachedAt: cached.generatedAt }, { headers: { 'cache-control': 'public, max-age=300, stale-while-revalidate=86400' } });
    }
    const data = await geocodeConflicts(await extractWikipediaConflicts());
    await saveConflictSnapshot(data);
    return NextResponse.json(data, { headers: { 'cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível atualizar os conflitos.' }, { status: 502 });
  }
}
