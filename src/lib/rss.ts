import { XMLParser } from 'fast-xml-parser';

export const RSS_FEEDS = {
  bbc: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  aljazeera: 'https://www.aljazeera.com/xml/rss/all.xml',
  guardian: 'https://www.theguardian.com/world/rss',
  hrw: 'https://www.hrw.org/rss/news',
} as const;

function valueOf(value: unknown) {
  if (value && typeof value === 'object' && '__cdata' in value) return String((value as { __cdata: unknown }).__cdata);
  if (value && typeof value === 'object' && '#text' in value) return String((value as { '#text': unknown })['#text']);
  return String(value ?? '');
}

export async function fetchRssFeed(source: keyof typeof RSS_FEEDS) {
  const response = await fetch(RSS_FEEDS[source], { next: { revalidate: 900 } });
  if (!response.ok) throw new Error(`Feed ${source} respondeu ${response.status}.`);
  const xml = await response.text();
  const parsed = new XMLParser({ ignoreAttributes: false, cdataPropName: '__cdata' }).parse(xml);
  const rawItems = parsed?.rss?.channel?.item || parsed?.feed?.entry || [];
  const items = (Array.isArray(rawItems) ? rawItems : [rawItems]).map((item: any, index) => ({
    title: valueOf(item.title?.['#text'] || item.title || 'Sem título'),
    pubDate: valueOf(item.pubDate || item.published || item.updated || ''),
    link: typeof item.link === 'object' ? valueOf(item.link['@_href'] || item.link['#text']) : valueOf(item.link),
    guid: valueOf(item.guid || item.id || `${source}-${index}`),
    author: valueOf(item.author), thumbnail: '',
    description: valueOf(item.description || item.summary),
    content: valueOf(item['content:encoded'] || item.content),
    enclosure: {}, categories: [],
  }));
  return { status: 'ok', items };
}
