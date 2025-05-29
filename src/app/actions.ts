
'use server';

import { summarizeConflictNews, type SummarizeConflictNewsInput, type SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import type { BbcNewsItemRss, ReliefWebReport, SummarizeNewsInputItem, CuratedConflictData } from '@/lib/types';
import curatedConflictDataJson from '@/data/curated-conflict-data.json';


export async function getAiSummaryAction(newsItemsToSummarize: SummarizeNewsInputItem[]): Promise<{ summary?: SummarizeConflictNewsOutput; error?: string }> {
  if (!newsItemsToSummarize || newsItemsToSummarize.length === 0) {
    return { error: 'Nenhum item de notícia fornecido para resumo.' };
  }

  const input: SummarizeConflictNewsInput = {
    newsItems: newsItemsToSummarize,
  };

  try {
    const result = await summarizeConflictNews(input);
    return { summary: result };
  } catch (error) {
    let detailedErrorMessage = 'Falha ao gerar resumo de IA.';
    if (error instanceof Error) {
      detailedErrorMessage = `Falha ao gerar resumo de IA: ${error.message}`;
      if ((error as any).cause) { 
        detailedErrorMessage += ` Causa: ${JSON.stringify((error as any).cause)}`;
      }
      console.error('Error calling AI summary flow. Message:', error.message, 'Stack:', error.stack, 'Details:', (error as any).details || 'N/A', 'Cause:', (error as any).cause || 'N/A');
    } else {
      console.error('Error calling AI summary flow (non-Error object):', error);
    }
    return { error: detailedErrorMessage };
  }
}

export async function getCuratedConflictsAction(): Promise<{ data?: CuratedConflictData; error?: string }> {
  try {
    const data: CuratedConflictData = curatedConflictDataJson as CuratedConflictData;
    if (!data) {
      return { error: 'Falha ao carregar dados de conflitos curados: arquivo não encontrado ou vazio.' };
    }
    return { data };

  } catch (error) {
    let detailedErrorMessage = 'Falha ao carregar dados de conflitos curados.';
    if (error instanceof Error) {
      detailedErrorMessage = `Falha ao carregar dados de conflitos curados: ${error.message}`;
      console.error('Error loading curated conflict data. Message:', error.message, 'Stack:', error.stack);
    } else {
      console.error('Error loading curated conflict data (non-Error object):', error);
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
        const descriptionLower = item.description ? item.description.toLowerCase() : "";
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

// Helper function to fetch minimal data for AI summary from Al Jazeera
export async function fetchAlJazeeraForAISummary(limit: number = 5): Promise<BbcNewsItemRss[]> {
  const ALJAZEERA_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.aljazeera.com%2Fxml%2Frss%2Fall.xml';
  const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'attack', 'rebel', 'insurgent', 'crisis', 'humanitarian'];
  try {
    const response = await fetch(ALJAZEERA_NEWS_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    if (apiResponse.status !== 'ok' || !apiResponse.items) return [];
    
    return apiResponse.items.filter((item: BbcNewsItemRss) => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description ? item.description.toLowerCase() : "";
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching Al Jazeera for AI:", error);
    return [];
  }
}

// Helper function to fetch minimal data for AI summary from Human Rights Watch
export async function fetchHrwReportsForAISummary(limit: number = 5): Promise<BbcNewsItemRss[]> {
  const HRW_REPORTS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.hrw.org%2Frss%2Fnews';
  const RELEVANT_KEYWORDS = ['war', 'conflict', 'crisis', 'humanitarian', 'rights', 'refugees', 'displacement', 'atrocities', 'civilians', 'accountability', 'ukraine', 'gaza', 'syria', 'yemen', 'sudan', 'myanmar', 'ethiopia'];
  try {
    const response = await fetch(HRW_REPORTS_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    if (apiResponse.status !== 'ok' || !apiResponse.items) return [];
    
    return apiResponse.items.filter((item: BbcNewsItemRss) => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description ? item.description.toLowerCase() : "";
        const contentLower = item.content ? item.content.toLowerCase() : "";
        return RELEVANT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword) || contentLower.includes(keyword));
      }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching HRW reports for AI:", error);
    return [];
  }
}
