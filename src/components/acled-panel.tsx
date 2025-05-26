
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, SourceStatus } from '@/lib/types';
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types based on ACLED API documentation and user's example
interface AcledEvent {
  event_id_cnty: string; // Or any unique ID field
  event_date: string;
  event_type: string;
  location: string;
  notes: string;
  country: string;
  fatalities?: number;
}

interface AcledApiResponse {
  // Assuming the structure from the user's example and typical API responses
  data: AcledEvent[];
  // Add other fields like count, status, etc., if present in the actual API response
}

interface AcledPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number; // To allow parent to trigger refresh
}

const ACLED_API_KEY = 'Hr3EHefA5L0Pd5HTj8x-'; // WARNING: Hardcoding API keys is insecure.
const ACLED_USER_EMAIL = 'mtcporto@gmail.com'; // User's email for API access

function getAcledDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Last 30 days
  return `${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;
}


export function AcledPanel({ onStatusChange, triggerFetch }: AcledPanelProps) {
  const [data, setData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const baseUrl = 'https://api.acleddata.com/acled/read';
      const params = new URLSearchParams({
        key: ACLED_API_KEY,
        email: ACLED_USER_EMAIL,
        limit: '10',
        event_date: getAcledDateRange(),
        fields: 'event_id_cnty,event_date,event_type,location,notes,country,fatalities',
        page: '1',
        // terms: 'accept' // May be required by ACLED if terms have updated / for specific access
      });
      const requestUrl = `${baseUrl}?${params.toString()}`;

      // Removed Authorization header, key and email are now in URL params
      const response = await fetch(requestUrl);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('ACLED API Error:', response.status, errorBody);
        throw new Error(`Falha ao buscar dados ACLED: ${response.status} ${response.statusText}. Detalhes: ${errorBody.substring(0,100)}`);
      }

      const apiResponse = await response.json() as AcledApiResponse;

      if (!apiResponse.data || apiResponse.data.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado.' });
        return;
      }
      
      const formattedData: NewsItem[] = apiResponse.data.map((event, index) => ({
        id: event.event_id_cnty || `acled-${index}`,
        date: event.event_date,
        title: event.event_type,
        description: event.notes || 'Sem descrição detalhada.',
        source: 'ACLED',
        country: event.country,
        location: event.location,
        eventType: event.event_type,
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados ACLED.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("ACLED fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum evento ACLED para mostrar.</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
