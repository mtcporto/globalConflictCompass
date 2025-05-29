
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, BbcNewsRssResponse, SourceStatus } from '@/lib/types'; // Reusing BbcNews types for rss2json structure
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlJazeeraNewsPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

const ALJAZEERA_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.aljazeera.com%2Fxml%2Frss%2Fall.xml';
// Keywords can be adjusted or removed for broader coverage
const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'rebel', 'insurgent', 'crisis', 'humanitarian'];

export function AlJazeeraNewsPanel({ onStatusChange, triggerFetch }: AlJazeeraNewsPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(ALJAZEERA_NEWS_API_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar notícias da Al Jazeera: ${response.status} ${response.statusText}`);
      }
      const apiResponse = await response.json() as BbcNewsRssResponse; // rss2json common structure

      if (apiResponse.status !== 'ok' || !apiResponse.items || apiResponse.items.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhuma notícia da Al Jazeera encontrada ou erro na API rss2json.' });
        setError('Nenhuma notícia da Al Jazeera encontrada ou erro na API rss2json.');
        return;
      }
      
      const conflictNews = apiResponse.items.filter(item => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description ? item.description.toLowerCase() : "";
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, 10);


      if (conflictNews.length === 0) {
         setData([]);
         onStatusChange({ status: 'success', message: 'Nenhuma notícia de conflito relevante encontrada na Al Jazeera hoje.' });
         return;
      }

      const formattedData: NewsItem[] = conflictNews.map(item => ({
        id: item.guid || item.link, // Use link as fallback ID
        date: item.pubDate,
        title: item.title,
        description: item.description ? item.description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : 'Sem descrição.',
        link: item.link,
        source: 'Al Jazeera',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notícias da Al Jazeera.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("Al Jazeera News fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0 && !isLoading) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notícia de conflito relevante da Al Jazeera para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
