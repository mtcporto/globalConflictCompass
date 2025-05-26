"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, ReliefWebApiResponse, SourceStatus } from '@/lib/types';
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ReliefWebPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number;
}

const RELIEFWEB_API_URL = 'https://api.reliefweb.int/v1/reports?appname=globalconflictcompass&query[value]=conflict&limit=10&preset=latest&fields[include][]=title&fields[include][]=date.created&fields[include][]=url&fields[include][]=body-html&profile=list';

export function ReliefWebPanel({ onStatusChange, triggerFetch }: ReliefWebPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const response = await fetch(RELIEFWEB_API_URL);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Falha ao buscar dados ReliefWeb: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0,100)}`);
      }
      const apiResponse = await response.json() as ReliefWebApiResponse;
      
      if (!apiResponse.data || apiResponse.data.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum dado ReliefWeb encontrado.' });
        return;
      }

      const formattedData: NewsItem[] = apiResponse.data.map(item => ({
        id: item.id,
        date: item.fields.date?.created || new Date().toISOString(),
        title: item.fields.title,
        description: item.fields.body?.substring(0, 150) + '...' || 'Sem descrição detalhada.',
        link: item.fields.url,
        source: 'ReliefWeb',
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados ReliefWeb.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("ReliefWeb fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma atualização ReliefWeb para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
