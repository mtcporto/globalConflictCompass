'use server';

import { createHash } from 'crypto';
import { summarizeConflictNews, type SummarizeConflictNewsInput, type SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { addAiSummaryToTurso, getLatestAiSummaryFromTurso } from '@/lib/firestore-db';
import { fetchRssFeed } from '@/lib/rss';
import type { BbcNewsItemRss, SummarizeNewsInputItem } from '@/lib/types';
import { getConflictSnapshot } from '@/lib/conflict-cache';

const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS_PER_SOURCE = 5;

const SOURCE_FILTERS: Record<string, string[]> = {
  BBC: ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'attack', 'rebel', 'insurgent'],
  'Al Jazeera': ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'attack', 'rebel', 'insurgent', 'crisis', 'humanitarian'],
  HRW: ['war', 'conflict', 'crisis', 'humanitarian', 'rights', 'refugees', 'displacement', 'atrocities', 'civilians', 'accountability', 'ukraine', 'gaza', 'syria', 'yemen', 'sudan', 'myanmar', 'ethiopia'],
  'The Guardian': ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'rebel', 'insurgent', 'crisis', 'humanitarian', 'refugees', 'displaced'],
};

function cleanText(value: string, maxLength = 500) {
  return value.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeItems(items: BbcNewsItemRss[], source: string): SummarizeNewsInputItem[] {
  const keywords = SOURCE_FILTERS[source] ?? [];
  return items
    .filter(item => {
      const text = `${item.title} ${item.description} ${item.content}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword));
    })
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .map(item => ({
      title: cleanText(item.title, 240),
      description: cleanText(item.content || item.description || 'Sem descrição disponível.', 500),
      link: item.link,
      source,
      publishedAt: item.pubDate,
    }));
}

async function fetchNewsForSummary(): Promise<SummarizeNewsInputItem[]> {
  const sources = [
    ['bbc', 'BBC'],
    ['aljazeera', 'Al Jazeera'],
    ['hrw', 'HRW'],
    ['guardian', 'The Guardian'],
  ] as const;

  const results = await Promise.all(sources.map(async ([feed, source]) => {
    try {
      const response = await fetchRssFeed(feed);
      return normalizeItems(response.items, source);
    } catch (error) {
      console.error(`Falha ao consultar ${source} para o resumo:`, error);
      return [];
    }
  }));

  return results.flat();
}

function keepMonitoredConflictNews(items: SummarizeNewsInputItem[], conflicts: SummarizeConflictNewsInput['conflicts']) {
  const generic = new Set(['africa', 'asia', 'europe', 'north america', 'south america', 'global', 'world']);
  const terms = conflicts.flatMap(conflict => [conflict.name, ...conflict.locations]).map(value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).filter(value => value.length > 3 && !generic.has(value));
  const armedIndicators = ['war', 'conflict', 'attack', 'airstrike', 'military', 'troops', 'ceasefire', 'insurgent', 'rebel', 'offensive', 'clash', 'shelling', 'fighters', 'armed'];
  return items.filter(item => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return terms.some(term => text.includes(term)) && armedIndicators.some(term => text.includes(term));
  });
}

function fingerprint(items: SummarizeNewsInputItem[]) {
  const stableItems = [...items].sort((a, b) => `${a.source}:${a.link || a.title}`.localeCompare(`${b.source}:${b.link || b.title}`));
  return createHash('sha256').update(JSON.stringify(stableItems)).digest('hex');
}

export async function getAiSummaryAction(
  forceRefresh = false,
): Promise<{ summary?: SummarizeConflictNewsOutput; error?: string; lastGenerated?: string; dataSource?: 'db' | 'ai'; sourceCount?: number }> {
  const snapshot = await getConflictSnapshot();
  if (!snapshot) return { error: 'O panorama de conflitos ainda não está disponível para contextualizar o resumo.' };
  const conflicts = snapshot?.data.conflicts.map(conflict => ({ id: conflict.id, name: conflict.name, locations: conflict.locations })) || [];
  const fetchedNews = await fetchNewsForSummary();
  const newsItems = keepMonitoredConflictNews(fetchedNews, conflicts);
  if (newsItems.length === 0) {
    return { error: 'Nenhuma notícia relevante foi encontrada nas fontes configuradas.' };
  }

  const inputHash = fingerprint(newsItems);
  if (!forceRefresh) {
    const cached = await getLatestAiSummaryFromTurso(inputHash, 2);
    if (cached && Date.now() - new Date(cached.lastGenerated).getTime() < SUMMARY_TTL_MS) {
      return { summary: cached.summary, lastGenerated: cached.lastGenerated, dataSource: 'db', sourceCount: newsItems.length };
    }
  }

  try {
    const input: SummarizeConflictNewsInput = { conflicts, newsItems };
    const result = await summarizeConflictNews(input);
    const generatedAt = new Date().toISOString();
    await addAiSummaryToTurso(result, inputHash);
    return { summary: result, lastGenerated: generatedAt, dataSource: 'ai', sourceCount: newsItems.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao gerar o resumo.';
    console.error('Erro ao gerar resumo por IA:', error);
    return { error: `Falha ao gerar resumo por IA: ${message}` };
  }
}
