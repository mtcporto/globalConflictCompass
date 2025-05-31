
'use server';

import { summarizeConflictNews, type SummarizeConflictNewsInput, type SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import type { BbcNewsItemRss, ReliefWebReport, SummarizeNewsInputItem, CuratedConflictData, CachedAiSummary } from '@/lib/types';
import curatedConflictDataJson from '@/data/curated-conflict-data.json';
import { addAiSummaryToFirestore, getLatestAiSummaryFromFirestore } from '@/lib/firestore-db'; // Alterado para Firestore

export async function getAiSummaryAction(
  newsItemsToSummarize: SummarizeNewsInputItem[],
  forceRefresh: boolean = false
): Promise<{ summary?: SummarizeConflictNewsOutput; error?: string; lastGenerated?: string; dataSource?: 'db' | 'ai' }> {
  
  if (!forceRefresh) {
    try {
      const cachedData = await getLatestAiSummaryFromFirestore();
      if (cachedData && cachedData.lastGenerated) {
        const lastGeneratedDate = new Date(cachedData.lastGenerated); // lastGenerated é ISO string
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (lastGeneratedDate > twentyFourHoursAgo) {
          console.log("AI Summary: Found recent in Firestore, using it.");
          return { 
            summary: cachedData.summary, 
            lastGenerated: cachedData.lastGenerated,
            dataSource: 'db' 
          };
        }
        console.log("AI Summary: Firestore cache is older than 24 hours.");
      } else {
        console.log("AI Summary: Not found in Firestore or missing timestamp.");
      }
    } catch (dbError) {
      console.error("AI Summary: Error reading from Firestore, will generate new one.", dbError);
      // Prossegue para gerar novo resumo se a leitura do Firestore falhar
    }
  }

  // Se forceRefresh for true, ou se não houver cache válido do Firestore
  console.log(`AI Summary: Generating new summary (forceRefresh: ${forceRefresh}).`);
  if (!newsItemsToSummarize || newsItemsToSummarize.length === 0) {
    // Isso só deve ser um erro se NENHUM item de notícia for fornecido para uma nova geração.
    // Se tínhamos um cache antigo, mas newsItemsToSummarize está vazio agora, ainda podemos tentar gerar (o que provavelmente falhará sem itens).
    // Mas se forceRefresh=false e newsItemsToSummarize está vazio, e o cache falhou, então é um problema.
    // No entanto, newsItemsToSummarize é sempre fornecido pelo painel.
    // A verificação principal de "sem itens" está no painel antes de chamar esta action para `forceRefresh:true`.
    console.warn("AI Summary: newsItemsToSummarize is empty. This might lead to a poor summary if AI generation is triggered.");
    // Não retornamos erro aqui, permitimos que a IA tente, pode haver um resumo antigo que passou da validade.
  }

  const input: SummarizeConflictNewsInput = {
    newsItems: newsItemsToSummarize.length > 0 ? newsItemsToSummarize : [{title: "Sem notícias recentes", description: "Não foram encontradas notícias recentes das fontes configuradas para gerar um novo resumo."}],
  };

  try {
    const result = await summarizeConflictNews(input);
    await addAiSummaryToFirestore(result); // Salva no Firestore
    const now = new Date().toISOString();
    console.log("AI Summary: New summary generated and saved to Firestore.");
    return { 
      summary: result,
      lastGenerated: now,
      dataSource: 'ai'
    };
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
    // For curated data, we directly import/read the JSON. No server-side caching file like .cache needed.
    const data: CuratedConflictData = curatedConflictDataJson as CuratedConflictData; 
    if (!data) {
      // This case should ideally not happen if the JSON file is part of the deployment
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

// Helper function to fetch minimal data for AI summary from The Guardian
export async function fetchGuardianNewsForAISummary(limit: number = 5): Promise<BbcNewsItemRss[]> {
  const GUARDIAN_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.theguardian.com%2Fworld%2Frss';
  const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'rebel', 'insurgent', 'crisis', 'humanitarian', 'refugees', 'displaced'];
  try {
    const response = await fetch(GUARDIAN_NEWS_API_URL);
    if (!response.ok) return [];
    const apiResponse = await response.json();
    if (apiResponse.status !== 'ok' || !apiResponse.items) return [];
    
    return apiResponse.items.filter((item: BbcNewsItemRss) => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = (item.description || item.content || "").toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching The Guardian for AI:", error);
    return [];
  }
}
