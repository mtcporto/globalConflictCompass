"use client";

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { getAiSummaryAction, fetchBbcNewsForAISummary, fetchReliefWebForAISummary } from '@/app/actions';
import type { SourceStatus, SummarizeNewsInputItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2 } from 'lucide-react';

interface AiSummaryPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

export function AiSummaryPanel({ onStatusChange }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    onStatusChange({ status: 'loading' });

    try {
      // Fetch fresh, minimal data for summarization
      const bbcItemsPromise = fetchBbcNewsForAISummary(2);
      const reliefWebItemsPromise = fetchReliefWebForAISummary(2);

      const [bbcItems, reliefWebItems] = await Promise.all([bbcItemsPromise, reliefWebItemsPromise]);

      const newsToSummarize: SummarizeNewsInputItem[] = [];

      bbcItems.forEach(item => {
        newsToSummarize.push({
          title: item.title,
          description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...', // Plain text snippet
          link: item.link,
        });
      });

      reliefWebItems.forEach(item => {
        newsToSummarize.push({
          title: item.fields.title,
          description: item.fields.body?.substring(0, 200) + '...' || 'Sem descrição detalhada.',
          link: item.fields.url,
        });
      });
      
      if (newsToSummarize.length === 0) {
        setError("Nenhuma notícia encontrada para gerar o resumo. Tente atualizar as outras fontes primeiro.");
        onStatusChange({ status: 'error', message: "Nenhuma notícia para resumir." });
        setIsLoading(false);
        return;
      }

      const result = await getAiSummaryAction(newsToSummarize);

      if (result.error) {
        throw new Error(result.error);
      }
      
      setSummary(result.summary || "Não foi possível gerar o resumo.");
      onStatusChange({ status: 'success' });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao gerar resumo.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("AI Summary error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);
  
  useEffect(() => {
    // Set initial status to idle as it requires user action
    onStatusChange({ status: 'idle' });
  }, [onStatusChange]);


  return (
    <div className="flex flex-col h-full">
      <Button onClick={generateSummary} disabled={isLoading} className="mb-4 w-full">
        <Wand2 className="mr-2 h-4 w-4" />
        {isLoading ? 'Gerando Resumo...' : 'Gerar Resumo com IA'}
      </Button>
      
      {isLoading && <LoadingSpinner text="Analisando notícias e gerando resumo..." />}
      {error && <ErrorDisplay message={error} />}
      
      {summary && !isLoading && (
        <ScrollArea className="flex-grow">
          <div className="prose prose-sm dark:prose-invert max-w-none p-1 bg-muted/30 rounded-md">
            <p className="whitespace-pre-wrap text-sm">{summary}</p>
          </div>
        </ScrollArea>
      )}
      {!summary && !isLoading && !error && (
         <p className="text-sm text-muted-foreground text-center flex-grow flex items-center justify-center">
           Clique no botão acima para gerar um resumo das últimas notícias de conflito.
         </p>
      )}
    </div>
  );
}
