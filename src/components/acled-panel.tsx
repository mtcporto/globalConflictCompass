
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

const ACLED_API_KEY = 'Hr3EHefA5L0Pd5HTj8x-'; 

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
        limit: '10',
        event_date: getAcledDateRange(), 
        country: 'Ukraine', 
        fields: 'event_id_cnty,event_date,event_type,location,notes,country,fatalities',
        page: '1',
        // terms: 'accept' // Tentatively removed
      });
      const requestUrl = `${baseUrl}?${params.toString()}`;

      const response = await fetch(requestUrl, {
        headers: {
          'Authorization': `Token ${ACLED_API_KEY}`
        }
      });
      
      const responseText = await response.text(); 
      console.log('ACLED API Raw Response Text:', responseText);

      if (!response.ok) {
        console.error('ACLED API HTTP Error:', response.status, response.statusText, 'Response body:', responseText);
        // Try to parse error from ACLED if responseText is JSON
        let detailMessage = responseText.substring(0,250);
        try {
            const errorJson = JSON.parse(responseText) as AcledApiResponse;
            if (errorJson.error && typeof errorJson.error.message === 'string') {
                detailMessage = errorJson.error.message;
            } else if (typeof errorJson.message === 'string') {
                detailMessage = errorJson.message;
            }
        } catch (e) {
            // Ignore if responseText is not JSON
        }
        throw new Error(`Falha ao buscar dados ACLED: ${response.status} ${response.statusText}. Detalhes: ${detailMessage}`);
      }

      let apiResponse: AcledApiResponse;
      try {
        apiResponse = JSON.parse(responseText) as AcledApiResponse;
      } catch (parseError) {
        console.error('ACLED API JSON Parse Error:', parseError, 'Raw response text:', responseText);
        throw new Error(`Erro ao processar resposta da API ACLED. Resposta não é JSON válido. Conteúdo: ${responseText.substring(0,150)}`);
      }
      
      console.log('ACLED API Raw Parsed Response:', apiResponse);

      if (apiResponse.success === false || 
          (typeof apiResponse.status === 'number' && [401, 403, 400].includes(apiResponse.status)) || // Check apiResponse.status as well
          (typeof apiResponse.status_code === 'number' && [401, 403, 400].includes(apiResponse.status_code))) {
        
        let extractedErrorMessage = 'ACLED API indicou falha sem uma mensagem específica.';
        if (apiResponse.error && typeof apiResponse.error.message === 'string' && apiResponse.error.message.trim() !== '') {
          extractedErrorMessage = apiResponse.error.message;
        } else if (typeof apiResponse.message === 'string' && apiResponse.message.trim() !== '') {
          extractedErrorMessage = apiResponse.message;
        } else if (typeof apiResponse.detail === 'string' && apiResponse.detail.trim() !== '') {
          extractedErrorMessage = apiResponse.detail;
        }
        
        console.error('ACLED API Logic Error:', extractedErrorMessage, 'Resposta completa:', apiResponse);
        throw new Error(extractedErrorMessage);
      }
      
      if (apiResponse.count === 0 && Array.isArray(apiResponse.data) && apiResponse.data.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado para os filtros atuais (Ucrânia, últimos 30 dias).' });
        return;
      }
      
      if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
        console.warn('ACLED API Warning: O campo "data" está ausente ou não é um array. Resposta:', apiResponse);
         if (apiResponse.count === 0) { 
            setData([]);
            onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado para os filtros atuais (Ucrânia, últimos 30 dias).' });
        } else {
            throw new Error('Formato de dados inesperado da API ACLED. O campo "data" não é um array ou está ausente, ou "count" indica dados mas "data" está vazio.');
        }
        return;
      }
      
      if (apiResponse.data.length === 0) {
        setData([]);
        onStatusChange({ status: 'success', message: 'Nenhum dado ACLED encontrado para Ucrânia nos últimos 30 dias.' });
        return;
      }
      
      const formattedData: NewsItem[] = apiResponse.data.map((event: AcledEventType, index: number) => ({
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
      setError(errorMessage); // Set error state to display in UI
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
  if (error) return <ErrorDisplay message={error} />; // Display the error using ErrorDisplay component
  if (data.length === 0) return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum evento ACLED para mostrar (Ucrânia, últimos 30 dias).</p>;

  return (
    <ScrollArea className="h-full">
      {data.map((item) => (
        <EventDisplay key={item.id} item={item} />
      ))}
    </ScrollArea>
  );
}

