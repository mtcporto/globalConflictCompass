
'use server';

import { summarizeConflictNews, type SummarizeConflictNewsInput, type SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { extractWikipediaConflicts, type ExtractWikipediaConflictsOutput } from '@/ai/flows/extract-wikipedia-conflicts-flow';
import type { BbcNewsItemRss, ReliefWebReport, SummarizeNewsInputItem, WikipediaConflictsData, WikipediaConflict } from '@/lib/types';
import fs from 'fs/promises';
import path from 'path';
import manualConflictData from '@/data/manual-conflict-data.json'; // Import manual overrides

const CACHE_DIR_PATH = path.join(process.cwd(), '.cache');
const WIKIPEDIA_CACHE_FILE_PATH = path.join(CACHE_DIR_PATH, 'wikipedia-conflicts.json');
const CACHE_MAX_AGE_HOURS = 24; // Cache data for 24 hours

// Create a map for quick lookup of manual overrides
const manualOverridesMap = new Map(manualConflictData.map(item => [item.id, item]));

async function ensureCacheDirExists() {
  try {
    await fs.access(CACHE_DIR_PATH);
  } catch {
    await fs.mkdir(CACHE_DIR_PATH, { recursive: true });
  }
}

async function readWikipediaCache(): Promise<WikipediaConflictsData | null> {
  try {
    await fs.access(WIKIPEDIA_CACHE_FILE_PATH);
    const fileContent = await fs.readFile(WIKIPEDIA_CACHE_FILE_PATH, 'utf-8');
    const cachedData = JSON.parse(fileContent) as WikipediaConflictsData;

    const cacheAgeHours = (new Date().getTime() - new Date(cachedData.lastUpdated).getTime()) / (1000 * 60 * 60);
    if (cacheAgeHours < CACHE_MAX_AGE_HOURS) {
      console.log('Serving Wikipedia conflicts data from cache.');
      return cachedData;
    }
    console.log('Wikipedia conflicts cache is stale.');
    return null;
  } catch (error) {
    console.warn('Error reading Wikipedia cache or cache is invalid/missing:', error);
    return null;
  }
}

async function writeWikipediaCache(data: WikipediaConflictsData): Promise<void> {
  try {
    await ensureCacheDirExists();
    await fs.writeFile(WIKIPEDIA_CACHE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Wikipedia conflicts data cached successfully.');
  } catch (error) {
    console.error('Error writing Wikipedia cache:', error);
  }
}

export async function getAiSummaryAction(newsItemsToSummarize: SummarizeNewsInputItem[]): Promise<{ summary?: SummarizeConflictNewsOutput; error?: string }> {
  if (!newsItemsToSummarize || newsItemsToSummarize.length === 0) {
    return { error: 'Nenhum item de notícia fornecido para resumo.' };
  }

  // The argument newsItemsToSummarize is now directly the array.
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
      console.error('Error calling AI summary flow. Message:', error.message, 'Stack:', error.stack, 'Details:', (error as any).details || 'N/A');
    } else {
      console.error('Error calling AI summary flow (non-Error object):', error);
    }
    return { error: detailedErrorMessage };
  }
}

export async function getWikipediaConflictsAction(options: { forceRefresh?: boolean } = {}): Promise<{ data?: WikipediaConflictsData; error?: string }> {
  const { forceRefresh = false } = options;

  if (!forceRefresh) {
    const cachedData = await readWikipediaCache();
    if (cachedData) {
      return { data: cachedData };
    }
  }

  console.log(forceRefresh ? 'Forcing refresh of Wikipedia conflicts data.' : 'Fetching fresh Wikipedia conflicts data.');
  try {
    const aiResult: ExtractWikipediaConflictsOutput = await extractWikipediaConflicts({});
    
    // Apply manual overrides and clean up imageUrl
    const processedConflicts = aiResult.conflicts.map(aiConflict => {
      // Clean the imageUrl from AI before considering overrides
      let currentImageUrl = (typeof aiConflict.imageUrl === 'string' && (aiConflict.imageUrl.startsWith('http://') || aiConflict.imageUrl.startsWith('https://')))
                              ? aiConflict.imageUrl
                              : undefined;
      let currentDetailsLink = aiConflict.detailsLink;

      const override = manualOverridesMap.get(aiConflict.id);
      if (override) {
        currentImageUrl = override.imageUrl || currentImageUrl; // Prioritize override's imageUrl
        currentDetailsLink = override.detailsLinkOverride || currentDetailsLink; // Prioritize override's detailsLink
      }

      return {
        ...aiConflict,
        imageUrl: currentImageUrl, // This will be either a valid URL or undefined
        detailsLink: currentDetailsLink,
      };
    });

    const dataToCache: WikipediaConflictsData = {
      ...aiResult,
      conflicts: processedConflicts,
      lastUpdated: new Date().toISOString(), // Ensure lastUpdated is always fresh after AI call + processing
    };
    
    await writeWikipediaCache(dataToCache);
    return { data: dataToCache };
  } catch (error) {
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
    if (!forceRefresh) {
        const staleCache = await fs.readFile(WIKIPEDIA_CACHE_FILE_PATH, 'utf-8').then(JSON.parse).catch(() => null);
        if (staleCache) {
            console.warn('Serving stale Wikipedia cache due to fetch error.');
            return { data: staleCache, error: `${detailedErrorMessage} (Exibindo dados de cache mais antigos).` };
        }
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
