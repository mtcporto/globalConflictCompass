
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, BbcNewsRssResponse, SourceStatus } from '@/lib/types'; // Reusing BbcNews types for rss2json structure
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReutersNewsPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

// Changed back to worldNews to see if it's more stable than topNews which gave 422
const REUTERS_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=http%3A%2F%2Ffeeds.reuters.com%2FReuters%2FworldNews';
const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'rebel', 'insurgent', 'crisis', 'attack'];

export function ReutersNewsPanel({ onStatusChange, triggerFetch }: ReutersNewsPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(REUTERS_NEWS_API_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar notícias da Reuters: ${response.status} ${response.statusText}`);
      }
      const apiResponse = await response.json() as BbcNewsRssResponse;

      if (apiResponse.status !== 'ok' || !apiResponse.items || apiResponse.items.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhuma notícia da Reuters encontrada ou erro na API rss2json.' });
        setError('Nenhuma notícia da Reuters encontrada ou erro na API rss2json.');
        return;
      }
      
      const conflictNews = apiResponse.items.filter(item => {
        const titleLower = item.title.toLowerCase();
        // Reuters description can be in item.content, often more detailed
        const contentLower = item.content ? item.content.toLowerCase() : (item.description ? item.description.toLowerCase() : "");
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || contentLower.includes(keyword));
      }).slice(0, 10);


      if (conflictNews.length === 0) {
         setData([]);
         onStatusChange({ status: 'success', message: 'Nenhuma notícia de conflito relevante encontrada na Reuters hoje.' });
         return;
      }

      const formattedData: NewsItem[] = conflictNews.map(item => ({
        id: item.guid || item.link,
        date: item.pubDate,
        title: item.title,
        description: (item.content || item.description || "").replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
        link: item.link,
        source: 'Reuters',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notícias da Reuters.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("Reuters News fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0 && !isLoading) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notícia de conflito relevante da Reuters para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
