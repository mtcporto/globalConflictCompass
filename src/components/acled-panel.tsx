
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
const ACLED_USER_EMAIL = 'mtcporto@gmail.com';

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
        key: ACLED_API_KEY,
        email: ACLED_USER_EMAIL,
        limit: '10',
        event_date: getAcledDateRange(), 
        country: 'Ukraine', 
        fields: 'event_id_cnty,event_date,event_type,location,notes,country,fatalities',
        page: '1',
        terms: 'accept' 
      });
      const requestUrl = `${baseUrl}?${params.toString()}`;

      // Log the request URL to verify
      console.log('ACLED Request URL:', requestUrl);

      const response = await fetch(requestUrl);
      
      const responseText = await response.text(); 
      console.log('ACLED API Raw Response Text:', responseText);

      if (!response.ok) {
        console.error('ACLED API HTTP Error:', response.status, response.statusText, 'Response body:', responseText);
        let detailMessage = `Falha ao buscar dados ACLED: ${response.status} ${response.statusText}.`;
        try {
            const errorJson = JSON.parse(responseText) as AcledApiResponse;
            // Try to extract a more specific message from the JSON error response
            if (errorJson.error && typeof errorJson.error === 'object' && errorJson.error !== null && typeof errorJson.error.message === 'string' && errorJson.error.message.trim() !== '') {
                detailMessage = errorJson.error.message;
                 if (response.status === 403 && errorJson.error.message.toLowerCase().includes('your account is restricted')) {
                    detailMessage = `Acesso à API ACLED negado (Erro 403): "${errorJson.error.message}" Sua chave de API pode estar restrita. Por favor, contate access@acleddata.com.`;
                }
            } else if (typeof errorJson.message === 'string' && errorJson.message.trim() !== '') {
                detailMessage = errorJson.message;
            } else if (typeof errorJson.detail === 'string' && errorJson.detail.trim() !== '') {
                detailMessage = errorJson.detail;
            }
        } catch (e) {
            // Stick to HTTP status message if responseText is not JSON
            detailMessage += ` Resposta da API: ${responseText.substring(0,250)}`;
        }
        throw new Error(detailMessage);
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
          (typeof apiResponse.status === 'number' && [400, 401, 403, 429].includes(apiResponse.status)) || // Added 429 for rate limiting
          (apiResponse.error && (apiResponse.error.status === 403 || apiResponse.error.status === 401 || apiResponse.error.status === 429)) ||
          (typeof apiResponse.status_code === 'number' && [400, 401, 403, 429].includes(apiResponse.status_code))) {
        
        let extractedErrorMessage = 'Falha na API ACLED. Por favor, tente novamente mais tarde.'; 

        if (apiResponse.error && typeof apiResponse.error === 'object' && apiResponse.error.message) {
            extractedErrorMessage = apiResponse.error.message;
            if (String(apiResponse.error.status).startsWith('4') && apiResponse.error.message.toLowerCase().includes('your account is restricted')) {
                extractedErrorMessage = `Acesso à API ACLED negado: "${apiResponse.error.message}" Seu acesso à API pode estar limitado. Por favor, verifique o e-mail enviado para access@acleddata.com ou contate o suporte ACLED para assistência.`;
            } else if (apiResponse.error.message.toLowerCase().includes("incorrect email or access key")) {
                extractedErrorMessage = `Chave de API ou e-mail ACLED incorreto. Verifique as credenciais. (${apiResponse.error.message})`;
            }
        } else if (apiResponse.message && typeof apiResponse.message === 'string' && apiResponse.message.trim() !== '') {
            extractedErrorMessage = apiResponse.message;
        } else if (apiResponse.detail && typeof apiResponse.detail === 'string' && apiResponse.detail.trim() !== '') {
            extractedErrorMessage = apiResponse.detail;
        }
        
        console.error('ACLED API Logic Error:', extractedErrorMessage, 'Raw Parsed Response for error context:', apiResponse);
        throw new Error(extractedErrorMessage);
      }
      
      if (!apiResponse.data || !Array.isArray(apiResponse.data) || (apiResponse.count === 0 && apiResponse.data?.length === 0) ) {
         setData([]);
         const message = (apiResponse.count === 0 && apiResponse.data?.length === 0) 
            ? 'Nenhum dado ACLED encontrado para os filtros atuais (Ucrânia, últimos 30 dias).'
            : 'Formato de dados inesperado ou vazio da API ACLED.';
         onStatusChange({ status: 'success', message });
         // Only set error if data is truly malformed beyond just being empty with count 0.
         if (!Array.isArray(apiResponse.data) && apiResponse.count !== 0) {
            setError(message); 
         }
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
