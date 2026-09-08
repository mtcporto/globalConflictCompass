"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, BbcNewsRssResponse, SourceStatus } from '@/lib/types';
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BbcNewsPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

// The server route fetches and parses the RSS feed.
const BBC_NEWS_API_URL = '/api/rss?source=bbc';
const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar'];

export function BbcNewsPanel({ onStatusChange, triggerFetch }: BbcNewsPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(BBC_NEWS_API_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar notícias da BBC: ${response.status} ${response.statusText}`);
      }
      const apiResponse = await response.json() as BbcNewsRssResponse;

      if (apiResponse.status !== 'ok' || !apiResponse.items || apiResponse.items.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhuma notícia da BBC encontrada.' });
        setError('Nenhuma notícia da BBC encontrada.');
        return;
      }
      
      const conflictNews = apiResponse.items.filter(item => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description.toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, 10);


      if (conflictNews.length === 0) {
         setData([]);
         onStatusChange({ status: 'success', message: 'Nenhuma notícia de conflito relevante encontrada na BBC hoje.' });
         //setError('Nenhuma notícia de conflito relevante encontrada na BBC hoje.'); // Not an error, just no relevant news
         return;
      }

      const formattedData: NewsItem[] = conflictNews.map(item => ({
        id: item.guid,
        date: item.pubDate,
        title: item.title,
        // RSS descriptions are HTML, strip tags for a plain text snippet.
        description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
        link: item.link,
        source: 'BBC News',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notícias da BBC.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("BBC News fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0 && !isLoading) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notícia de conflito relevante da BBC para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
