
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, BbcNewsRssResponse, SourceStatus } from '@/lib/types'; // Reusing BbcNews types for rss2json structure
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GuardianNewsPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

// The Guardian World News RSS feed via rss2json
const GUARDIAN_NEWS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.theguardian.com%2Fworld%2Frss';
const CONFLICT_KEYWORDS = ['war', 'conflict', 'ukraine', 'gaza', 'syria', 'military', 'troops', 'airstrike', 'ceasefire', 'palestine', 'israel', 'yemen', 'sudan', 'myanmar', 'rebel', 'insurgent', 'crisis', 'humanitarian', 'refugees', 'displaced'];

export function GuardianNewsPanel({ onStatusChange, triggerFetch }: GuardianNewsPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(GUARDIAN_NEWS_API_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar notícias do The Guardian: ${response.status} ${response.statusText}`);
      }
      const apiResponse = await response.json() as BbcNewsRssResponse; 

      if (apiResponse.status !== 'ok' || !apiResponse.items || apiResponse.items.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhuma notícia do The Guardian encontrada ou erro na API rss2json.' });
        setError('Nenhuma notícia do The Guardian encontrada ou erro na API rss2json.');
        return;
      }
      
      const conflictNews = apiResponse.items.filter(item => {
        const titleLower = item.title.toLowerCase();
        // Guardian descriptions can be short, sometimes full content is in 'content' field for rss2json
        const descriptionLower = (item.description || item.content || "").toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword));
      }).slice(0, 10);


      if (conflictNews.length === 0) {
         setData([]);
         onStatusChange({ status: 'success', message: 'Nenhuma notícia de conflito relevante encontrada no The Guardian hoje.' });
         return;
      }

      const formattedData: NewsItem[] = conflictNews.map(item => ({
        id: item.guid || item.link,
        date: item.pubDate,
        title: item.title,
        description: (item.content || item.description || "").replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
        link: item.link,
        source: 'The Guardian',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar notícias do The Guardian.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("The Guardian News fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0 && !isLoading) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma notícia de conflito relevante do The Guardian para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
