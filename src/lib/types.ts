
import type { SummarizeConflictNewsOutput } from "@/ai/flows/summarize-conflict-news";

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  description: string;
  source: string;
  link?: string;
  country?: string;
  eventType?: string; // For ACLED
  location?: string; // For ACLED
}

export type ApiName = 
  | 'acled' 
  | 'reliefweb' 
  | 'bbc' 
  | 'aiSummary' 
  | 'wikipediaConflicts' 
  | 'aljazeera'
  | 'hrw'
  | 'guardian';

export type ApiStatus = 'loading' | 'success' | 'error' | 'idle';

export interface SourceStatus {
  status: ApiStatus;
  message?: string;
}

export interface AllApiStatuses {
  acled: SourceStatus;
  reliefweb: SourceStatus;
  bbc: SourceStatus;
  aiSummary: SourceStatus;
  wikipediaConflicts: SourceStatus; 
  aljazeera: SourceStatus;
  hrw: SourceStatus;
  guardian: SourceStatus;
}

// ACLED specific types
export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  location: string;
  notes: string;
  country: string;
  fatalities?: number | string; 
}

export interface AcledErrorDetail {
  status?: number;
  message?: string;
}

export interface AcledApiResponse {
  status?: number | boolean; 
  success?: boolean;
  count?: number;
  data?: AcledEvent[]; 
  message?: string; 
  detail?: string;  
  status_code?: number; 
  error?: AcledErrorDetail | string | { message?: string; status?: number }; 
}


// ReliefWeb specific types
export interface ReliefWebReportField {
  title: string;
  date?: { created: string };
  url?: string;
  body?: string; 
}
export interface ReliefWebReport {
  id: string;
  fields: ReliefWebReportField;
}

export interface ReliefWebApiResponse {
  data: ReliefWebReport[];
  totalCount: number;
}

// BBC News and other rss2json based feeds
export interface BbcNewsItemRss { 
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string; 
  enclosure: object;
  categories: string[];
}

export interface BbcNewsRssResponse { 
  status: string;
  feed: {
    url: string;
    title: string;
    link: string;
    author: string;
    description: string;
    image: string;
  };
  items: BbcNewsItemRss[];
}

// For AI Summary input
export interface SummarizeNewsInputItem {
  title: string;
  description: string;
  link?: string;
}

// For Curated Conflict Data from JSON file
export type ConflictSeverityCategory = "Alta Gravidade" | "Média Gravidade" | "Baixa Gravidade";

export interface CuratedConflictEntry {
  nome: string;
  imagem_url: string;
  inicio: string;
  fatalidades_reportadas?: number;
  fatalidades_texto: string;
  territorio: string;
  coordenadas: [number, number];
  envolvidos: string[];
  wikipedia_link: string;
  status: string;
  tipo_conflito: string;
  data_ultima_atualizacao_fatalidades: string;
  impacto_humanitario: string;
  atores_externos_envolvidos: string;
  tendencia_recente: string;
  fonte_dados_especifica: string;
  regiao_geopolitica: string;
  severityCategory?: string; 
}

export type CuratedConflictData = {
  [key in ConflictSeverityCategory]?: CuratedConflictEntry[];
} & {
  [key: string]: CuratedConflictEntry[] | undefined;
};


// For Cached/DB AI Summary
export interface CachedAiSummary {
  summary: SummarizeConflictNewsOutput;
  lastGenerated: string; // ISO date string
}
