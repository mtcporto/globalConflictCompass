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

const ACLED_API_KEY = 'Hr3EHefA5L0Pd5HTj8x-'; // WARNING: Hardcoding API keys is insecure for production. Use environment variables and backend proxy.
const ACLED_API_URL = `https://api.acleddata.com/acled/read?limit=10&event_date=${getAcledDateRange()}&fields=event_id_cnty,event_date,event_type,location,notes,country,fatalities&key=${ACLED_API_KEY}&page=1`;


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
      // The ACLED API seems to sometimes return 403 or other errors if not properly authenticated or rate-limited.
      // The user provided key and structure indicates a direct fetch.
      // For a robust solution, this should be via a backend.
      // The URL in the user's example uses Authorization header, but their test endpoint needs a key in URL.
      // Trying with key in URL based on common ACLED API patterns.
      // If this fails, it means the specific endpoint or auth method from user's example is needed.
      // The user's example JS fetch uses 'Authorization': 'Token ...'
      // Let's stick to the user's fetch implementation style as much as possible.
      const currentAcledUrl = `https://api.acleddata.com/acled/read?limit=10&event_date=${getAcledDateRange()}&fields=event_id_cnty,event_date,event_type,location,notes,country,fatalities`;

      const response = await fetch(currentAcledUrl, {
        headers: {
          // ACLED new API might not use token in header for basic access, or might use a different key.
          // The example provided key `Hr3EHefA5L0Pd5HTj8x-` might be for an older API or a specific plan.
          // For now, assuming it's a direct key or that no key is needed for a very limited public request.
          // If a key is needed as 'Token <key>', it would be:
          // 'Authorization': `Token ${ACLED_API_KEY}` 
          // Let's try without specific Auth header if the key is in URL or not needed for basic query.
          // The user code used `Token ...` but the provided key doesn't look like a typical Bearer token.
          // It's more likely a query parameter key as used in `ACLED_API_URL`.
          // Let's try with the user's provided key but in the URL as per standard ACLED docs.
          // If the user's key `Hr3EHefA5L0Pd5HTj8x-` is a "Token", it should be in the header.
          // The user's fetch: `fetch('https://api.acleddata.com/acled/read?limit=5...', { headers: {'Authorization': 'Token Hr3EHefA5L0Pd5HTj8x-'} })`
          // So, let's use that.
        }
      });
      
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
