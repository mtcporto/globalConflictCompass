
'use server';

import { summarizeConflictNews, type SummarizeConflictNewsInput, type SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { extractWikipediaConflicts, type ExtractWikipediaConflictsOutput } from '@/ai/flows/extract-wikipedia-conflicts-flow';
import type { BbcNewsItemRss, ReliefWebReport, SummarizeNewsInputItem, WikipediaConflictsData } from '@/lib/types';


export async function getAiSummaryAction(newsToSummarize: SummarizeNewsInputItem[]): Promise<{ summary?: SummarizeConflictNewsOutput; error?: string }> {
  if (!newsToSummarize || newsToSummarize.length === 0) {
    return { error: 'Nenhum item de notícia fornecido para resumo.' };
  }

  const input: SummarizeConflictNewsInput = {
    newsItems: newsToSummarize,
  };

  try {
    const result = await summarizeConflictNews(input);
    return { summary: result };
  } catch (error) {
    let detailedErrorMessage = 'Falha ao gerar resumo de IA.';
    if (error instanceof Error) {
      detailedErrorMessage = `Falha ao gerar resumo de IA: ${error.message}`;
      console.error('Error calling AI summary flow. Message:', error.message, 'Stack:', error.stack, 'Details:', (error as any).details || 'N/A');
    } else {
      console.error('Error calling AI summary flow (non-Error object):', error);
    }
    return { error: detailedErrorMessage };
  }
}

export async function getWikipediaConflictsAction(): Promise<{ data?: WikipediaConflictsData; error?: string }> {
  try {
    const result: ExtractWikipediaConflictsOutput = await extractWikipediaConflicts({});
    // The Genkit flow output (ExtractWikipediaConflictsOutput) matches WikipediaConflictsData structure
    return { data: result as WikipediaConflictsData };
  } catch (error)
 {
    let detailedErrorMessage = 'Falha ao extrair dados de conflitos da Wikipedia.';
    if (error instanceof Error) {
      if (error.message.includes('503') || error.message.toLowerCase().includes('model is overloaded')) {
        detailedErrorMessage = 'O serviço de IA para extração de dados da Wikipedia está temporariamente sobrecarregado. Por favor, tente novamente mais tarde.';
      } else {
        detailedErrorMessage = `Falha ao extrair dados de conflitos da Wikipedia: ${error.message}`;
      }
      console.error('Error calling Wikipedia conflicts flow. Message:', error.message, 'Stack:', error.stack);
    } else {
      console.error('Error calling Wikipedia conflicts flow (non-Error object):', error);
    }
    return { error: detailedErrorMessage };
  }
}


// Helper function to fetch minimal data for AI summary from BBC
export async function fetchBbcNewsForAISummary(limit: number = 5): Promise<BbcNewsItemRss[]> {
  const BBC_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=http://feeds.bbci.co.uk/news/world/rss.xml';
  const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'attack', 'rebel', 'insurgent'];
  try {
    const response = await fetch(BBC_NEWS_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    if (apiResponse.status !== 'ok' || !apiResponse.items) return [];
    
    return apiResponse.items.filter((item: BbcNewsItemRss) => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description.toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching BBC for AI:", error);
    return [];
  }
}

// Helper function to fetch minimal data for AI summary from ReliefWeb
export async function fetchReliefWebForAISummary(limit: number = 5): Promise<ReliefWebReport[]> {
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
