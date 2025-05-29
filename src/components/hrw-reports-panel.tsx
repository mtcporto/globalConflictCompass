
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, BbcNewsRssResponse, SourceStatus } from '@/lib/types'; // Reusing BbcNews types for rss2json structure
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HrwReportsPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

const HRW_REPORTS_API_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.hrw.org%2Frss%2Fnews';
// Keywords to filter HRW reports relevant to conflicts and humanitarian crises
const RELEVANT_KEYWORDS = ['war', 'conflict', 'crisis', 'humanitarian', 'rights', 'refugees', 'displacement', 'atrocities', 'civilians', 'accountability', 'ukraine', 'gaza', 'syria', 'yemen', 'sudan', 'myanmar', 'ethiopia'];

export function HrwReportsPanel({ onStatusChange, triggerFetch }: HrwReportsPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(HRW_REPORTS_API_URL);
      if (!response.ok) {
        throw new Error(`Falha ao buscar relatórios da Human Rights Watch: ${response.status} ${response.statusText}`);
      }
      const apiResponse = await response.json() as BbcNewsRssResponse;

      if (apiResponse.status !== 'ok' || !apiResponse.items || apiResponse.items.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum relatório da HRW encontrado ou erro na API rss2json.' });
        setError('Nenhum relatório da HRW encontrado ou erro na API rss2json.');
        return;
      }
      
      const relevantReports = apiResponse.items.filter(item => {
        const titleLower = item.title.toLowerCase();
        const descriptionLower = item.description ? item.description.toLowerCase() : "";
        // HRW content might be more in 'content' field
        const contentLower = item.content ? item.content.toLowerCase() : ""; 
        return RELEVANT_KEYWORDS.some(keyword => titleLower.includes(keyword) || descriptionLower.includes(keyword) || contentLower.includes(keyword));
      }).slice(0, 10);


      if (relevantReports.length === 0) {
         setData([]);
         onStatusChange({ status: 'success', message: 'Nenhum relatório relevante da HRW encontrado hoje.' });
         return;
      }

      const formattedData: NewsItem[] = relevantReports.map(item => ({
        id: item.guid || item.link,
        date: item.pubDate,
        title: item.title,
        description: (item.content || item.description || "").replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
        link: item.link,
        source: 'Human Rights Watch',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar relatórios da HRW.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("HRW Reports fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0 && !isLoading) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum relatório relevante da Human Rights Watch para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
