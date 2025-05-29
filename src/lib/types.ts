
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

export type ApiName = 'acled' | 'reliefweb' | 'bbc' | 'aiSummary' | 'wikipediaConflicts'; // wikipediaConflicts is now curated
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
  wikipediaConflicts: SourceStatus; // For the curated data panel
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
  error?: AcledErrorDetail | string; 
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

// BBC News (rss2json) specific types
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

// For AI Summary of BBC/ReliefWeb
export interface SummarizeNewsInputItem {
  title: string;
  description: string;
  link?: string;
}

// For Curated Conflict Data (replaces Wikipedia extraction)
export type ConflictSeverityCategory = "Alta Gravidade" | "Média Gravidade" | "Baixa Gravidade";

export interface CuratedConflictEntry {
  nome: string;
  imagem_url: string;
  inicio: string;
  fatalidades_reportadas?: number; // Added as per JSON
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
  severityCategory?: ConflictSeverityCategory; // Added to carry severity info
}

export interface CuratedConflictData {
  "Alta Gravidade": CuratedConflictEntry[];
  "Média Gravidade": CuratedConflictEntry[];
  "Baixa Gravidade": CuratedConflictEntry[];
  // Add more keys if your JSON structure has them
}
