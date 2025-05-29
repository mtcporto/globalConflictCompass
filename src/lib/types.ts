
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
  | 'wikipediaConflicts' // This now refers to the curated data
  | 'aljazeera'
  | 'hrw';

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
  aljazeera: SourceStatus;
  hrw: SourceStatus;
}

// ACLED specific types
export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  location: string;
  notes: string;
  country: string;
  fatalities?: number | string; // Made flexible
}

export interface AcledErrorDetail {
  status?: number;
  message?: string;
}

export interface AcledApiResponse {
  status?: number | boolean; // Can be a boolean (false for error) or HTTP status code
  success?: boolean;
  count?: number;
  data?: AcledEvent[]; // Optional: not present in all error responses
  message?: string; // General message
  detail?: string;  // More specific detail
  status_code?: number; // Sometimes ACLED uses this for HTTP status
  error?: AcledErrorDetail | string; // Can be an object or a string
}


// ReliefWeb specific types
export interface ReliefWebReportField {
  title: string;
  date?: { created: string };
  url?: string;
  body?: string; // Sometimes it's body-html, but we process it as string
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
export interface BbcNewsItemRss { // Reused for AlJazeera, HRW via rss2json
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string; // Often contains more detailed HTML content
  enclosure: object;
  categories: string[];
}

export interface BbcNewsRssResponse { // Reused for AlJazeera, HRW via rss2json
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


// For Curated Conflict Data (replaces Wikipedia extraction)
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
  severityCategory?: ConflictSeverityCategory; 
}

export type CuratedConflictData = {
  [key in ConflictSeverityCategory]?: CuratedConflictEntry[];
} & {
  // Allowing other keys if necessary, though we primarily use the three above
  [key: string]: CuratedConflictEntry[] | undefined;
};
