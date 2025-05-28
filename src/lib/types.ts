
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

export type ApiName = 'acled' | 'reliefweb' | 'bbc' | 'aiSummary' | 'wikipediaConflicts';
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

// For Wikipedia Conflict Data Extraction
export type WikipediaConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface WikipediaConflict {
  id: string;
  name: string;
  severity: WikipediaConflictSeverity;
  fatalitiesRaw: string; // e.g., "10,000+" or "1,000-9,999"
  locations: string[]; // Countries or main regions involved
  startDate?: string;
  territory?: string; // Specific territory if mentioned
  detailsLink?: string; // Link to a more detailed Wikipedia page or section
  imageUrl?: string; // URL for the conflict's main image
  latitude?: number | null; // Approximate latitude
  longitude?: number | null; // Approximate longitude
}

export interface WikipediaConflictsData {
  conflicts: WikipediaConflict[];
  sourcePage: string;
  lastUpdated: string; // ISO date string for when the data was fetched/processed
}

    