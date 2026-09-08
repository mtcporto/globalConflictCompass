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
