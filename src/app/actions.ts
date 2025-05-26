'use server';

import { summarizeConflictNews, type SummarizeConflictNewsInput } from '@/ai/flows/summarize-conflict-news';
import type { BbcNewsItemRss, ReliefWebReport } from '@/lib/types';

export async function getAiSummaryAction(newsToSummarize: Array<{ title: string, description: string, link?: string }>) {
  if (!newsToSummarize || newsToSummarize.length === 0) {
    return { error: 'Nenhum item de notícia fornecido para resumo.' };
  }

  const input: SummarizeConflictNewsInput = {
    newsItems: newsToSummarize.map(item => ({
      title: item.title,
      description: item.description.substring(0, 500), // Limit description length for the prompt
      link: item.link,
    })),
  };

  try {
    const result = await summarizeConflictNews(input);
    return { summary: result.summary };
  } catch (error) {
    console.error('Error calling AI summary flow:', error);
    return { error: 'Falha ao gerar resumo de IA.' };
  }
}

// Helper function to fetch minimal data for AI summary from BBC
export async function fetchBbcNewsForAISummary(limit: number = 2): Promise<BbcNewsItemRss[]> {
  const BBC_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=http://feeds.bbci.co.uk/news/world/rss.xml';
  const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military'];
  try {
    const response = await fetch(BBC_NEWS_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    if (apiResponse.status !== 'ok' || !apiResponse.items) return [];
    
    return apiResponse.items.filter((item: BbcNewsItemRss) => {
        const titleLower = item.title.toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword));
      }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching BBC for AI:", error);
    return [];
  }
}

// Helper function to fetch minimal data for AI summary from ReliefWeb
export async function fetchReliefWebForAISummary(limit: number = 2): Promise<ReliefWebReport[]> {
  const RELIEFWEB_API_URL = `https://api.reliefweb.int/v1/reports?appname=globalconflictcompass&query[value]=conflict&limit=${limit}&preset=latest&fields[include][]=title&fields[include][]=date.created&fields[include][]=url&fields[include][]=body-html&profile=list`;
  try {
    const response = await fetch(RELIEFWEB_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    return apiResponse.data || [];
  } catch (error) {
    console.error("Error fetching ReliefWeb for AI:", error);
    return [];
  }
}
