
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { NewsItem, SourceStatus, AcledEvent as AcledEventType, AcledApiResponse } from '@/lib/types';
import { EventDisplay } from './event-display';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AcledPanelProps {
  onStatusChange: (status: SourceStatus) => void;
  triggerFetch?: number; // To allow parent to trigger refresh
}

const ACLED_API_KEY = 'Hr3EHefA5L0Pd5HTj8x-'; // User's API key
// const ACLED_USER_EMAIL = 'mtcporto@gmail.com'; // Not strictly needed for token auth

function getAcledDateRange(days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
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
        // key and email removed, auth is via header
        limit: '10',
        event_date: getAcledDateRange(), // Last 30 days
        country: 'Ukraine', // Querying for Ukraine as per suggestion
        fields: 'event_id_cnty,event_date,event_type,location,notes,country,fatalities',
        page: '1',
        terms: 'accept' // Essential parameter
      });
      const requestUrl = `${baseUrl}?${params.toString()}`;

      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Token ${ACLED_API_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('ACLED API HTTP Error:', response.status, errorBody);
        throw new Error(`Falha ao buscar dados ACLED: ${response.status} ${response.statusText}. Detalhes: ${errorBody.substring(0,150)}`);
      }

      const apiResponse = await response.json() as AcledApiResponse;

      // Explicitly check for API-level error indicated by 'success: false' or other error indicators
      if (apiResponse.success === false || apiResponse.status_code === 401 || apiResponse.status_code === 403) {
        const errorMessage = apiResponse.message || apiResponse.detail || 'ACLED API indicou falha sem uma mensagem específica.';
        console.error('ACLED API Logic Error:', errorMessage, 'Resposta completa:', apiResponse);
        throw new Error(errorMessage);
      }

      // Check if data exists and is an array
      if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
        console.warn('ACLED API Warning: O campo "data" está ausente ou não é um array. Resposta:', apiResponse);
        // Consider this a success with no data if count is 0, otherwise an error
        if (apiResponse.count === 0) {
            setData([]);
            onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado para os filtros atuais (Ucrânia, últimos 30 dias).' });
        } else {
            throw new Error('Formato de dados inesperado da API ACLED. O campo "data" não é um array ou está ausente.');
        }
        return;
      }
      
      if (apiResponse.data.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado para Ucrânia nos últimos 30 dias.' });
        return;
      }
      
      const formattedData: NewsItem[] = apiResponse.data.map((event: AcledEventType, index: number) => ({
        id: event.event_id_cnty || `acled-${index}`, // Fallback id
        date: event.event_date,
        title: event.event_type,
        description: event.notes || 'Sem descrição detalhada.',
        source: 'ACLED',
        country: event.country,
        location: event.location,
        eventType: event.event_type,
        // fatalities: event.fatalities !== undefined ? Number(event.fatalities) : 0, // Ensure fatalities is a number
      }));
      setData(formattedData);
      onStatusChange({ status: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados ACLED.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("ACLED fetch error details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, triggerFetch]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum evento ACLED para mostrar (Ucrânia, últimos 30 dias).</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}
