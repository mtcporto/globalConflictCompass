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

export type ApiName = 'acled' | 'reliefweb' | 'bbc' | 'aiSummary';
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
}

// ACLED specific types
export interface AcledEvent {
  event_id_cnty: string;
  event_date: string;
  event_type: string;
  location: string;
  notes: string;
  country: string;
  fatalities: number; // Assuming fatalities is a number
}

export interface AcledApiResponse {
  status: boolean;
  count: number;
  data: AcledEvent[];
  message?: string; // In case of error
}

// ReliefWeb specific types
export interface ReliefWebReportField {
  title: string;
  date?: { created: string };
  url?: string;
  body?: string; // if description is needed
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
  description: string; // HTML content
  content: string; // HTML content
  enclosure: object;
  categories: string[];
}

export interface BbcNewsRssResponse {
  status: string; // "ok" or "error"
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

// For AI Summary
export interface SummarizeNewsInputItem {
  title: string;
  description: string;
  link?: string;
}
