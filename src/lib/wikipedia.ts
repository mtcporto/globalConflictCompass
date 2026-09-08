import { createHash } from 'crypto';
import { translateWikipediaContext } from '@/ai/flows/translate-wikipedia-context';
import { ensureTursoSchema, turso } from './turso';
import type { WikipediaConflictLink } from '@/lib/types';

export interface WikipediaPageSummary {
  title: string;
  extract: string;
  contentUrls?: { desktop?: { page?: string } };
}

export async function getWikipediaSummaries(links: WikipediaConflictLink[]): Promise<WikipediaPageSummary[]> {
  const selected = [...new Map(links.map(link => [link.url, link])).values()].slice(0, 8);
  const results = await Promise.all(selected.map(async link => {
    const title = link.url.split('/wiki/')[1];
    if (!title) return null;
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, { next: { revalidate: 86400 } });
      if (!response.ok) return null;
      const summary = await response.json() as WikipediaPageSummary;
      return { ...summary, title: link.title };
    } catch {
      return null;
    }
  }));
  return results.filter((item): item is WikipediaPageSummary => item !== null && Boolean(item.extract));
}

export async function getTranslatedWikipediaSummaries(conflictId: string, summaries: WikipediaPageSummary[]) {
  const input = summaries.map(summary => ({ title: summary.title, extract: summary.extract, link: summary.contentUrls?.desktop?.page || '' })).filter(page => page.link);
  if (input.length === 0) return [];
  const sourceHash = createHash('sha256').update(`translation-v2:${JSON.stringify(input)}`).digest('hex');
  if (turso) {
    await ensureTursoSchema();
    const result = await turso.execute({ sql: 'SELECT context_data FROM wikipedia_contexts WHERE conflict_id = ? AND source_hash = ? LIMIT 1', args: [conflictId, sourceHash] });
    const row = result.rows[0] as { context_data?: string } | undefined;
    if (row?.context_data) return JSON.parse(row.context_data) as Array<{ title: string; translatedExtract: string; link: string }>;
  }
  const translated = await translateWikipediaContext({ pages: input });
  if (turso) {
    await turso.execute({ sql: 'INSERT INTO wikipedia_contexts (conflict_id, source_hash, context_data, generated_at) VALUES (?, ?, ?, ?) ON CONFLICT(conflict_id) DO UPDATE SET source_hash = excluded.source_hash, context_data = excluded.context_data, generated_at = excluded.generated_at', args: [conflictId, sourceHash, JSON.stringify(translated.pages), new Date().toISOString()] });
  }
  return translated.pages;
}
