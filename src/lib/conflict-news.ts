import { fetchRssFeed } from '@/lib/rss';
import type { BbcNewsItemRss, WikipediaConflict } from '@/lib/types';

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function getRelatedConflictNews(conflict: WikipediaConflict, limit = 8): Promise<Array<BbcNewsItemRss & { source: string }>> {
  const terms = [conflict.name, ...conflict.locations, ...(conflict.wikipediaLinks || []).map(link => link.title)]
    .map(normalize)
    .filter(term => term.length > 3);
  const armedIndicators = ['war', 'conflict', 'attack', 'airstrike', 'military', 'troops', 'ceasefire', 'insurgent', 'rebel', 'offensive', 'clash', 'shelling', 'fighters', 'armed'];
  const sources = [['bbc', 'BBC'], ['aljazeera', 'Al Jazeera'], ['hrw', 'HRW'], ['guardian', 'The Guardian']] as const;
  const groups = await Promise.all(sources.map(async ([feed, source]) => {
    try {
      const response = await fetchRssFeed(feed);
      return response.items.filter(item => {
        const text = normalize(`${item.title} ${item.description} ${item.content}`);
        return terms.some(term => text.includes(term)) && armedIndicators.some(term => text.includes(term));
      }).map(item => ({ ...item, source }));
    } catch {
      return [];
    }
  }));
  return groups.flat().sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, limit);
}
