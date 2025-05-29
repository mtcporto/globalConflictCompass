
"use client";

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { getAiSummaryAction, fetchBbcNewsForAISummary, fetchReliefWebForAISummary } from '@/app/actions';
import type { SourceStatus, SummarizeNewsInputItem, BbcNewsItemRss, ReliefWebReport } from '@/lib/types';
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
// ScrollArea will be removed
import { Wand2, Info } from 'lucide-react';

interface AiSummaryPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

export function AiSummaryPanel({ onStatusChange }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<SummarizeConflictNewsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    onStatusChange({ status: 'loading' });

    try {
      const bbcItemsPromise = fetchBbcNewsForAISummary(5); 
      const reliefWebItemsPromise = fetchReliefWebForAISummary(5);

      const [bbcData, reliefWebData] = await Promise.all([bbcItemsPromise, reliefWebItemsPromise]);

      const newsItemsToSummarize: SummarizeNewsInputItem[] = [];

      bbcData.forEach((item: BbcNewsItemRss) => {
        newsItemsToSummarize.push({
          title: item.title,
          description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 350) + '...',
          link: item.link,
        });
      });

      reliefWebData.forEach((item: ReliefWebReport) => {
        const description = item.fields.body?.replace(/<[^>]*>?/gm, '').substring(0, 350) + '...' || 'Sem descrição detalhada.';
        newsItemsToSummarize.push({
          title: item.fields.title,
          description: description,
          link: item.fields.url,
        });
      });
      
      if (newsItemsToSummarize.length === 0) {
        setError("Nenhuma notícia encontrada para gerar o resumo. Tente atualizar as outras fontes primeiro ou verifique a conexão.");
        onStatusChange({ status: 'error', message: "Nenhuma notícia para resumir." });
        setIsLoading(false);
        return;
      }
      
      const result = await getAiSummaryAction(newsItemsToSummarize);

      if (result.error) {
        throw new Error(result.error);
      }
      
      setSummary(result.summary || null);
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
    if (!isLoading && !summary && !error) {
      onStatusChange({ status: 'idle' });
    }
  }, [isLoading, summary, error, onStatusChange]);


  return (
    <div className="flex flex-col h-full">
      <Button onClick={generateSummary} disabled={isLoading} className="mb-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        <Wand2 className="mr-2 h-4 w-4" />
        {isLoading ? 'Analisando Notícias e Gerando Resumo...' : 'Gerar Resumo de Notícias com IA'}
      </Button>
      
      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Este resumo é gerado por IA com base nas notícias mais recentes da BBC e ReliefWeb (até 5 de cada). 
          Pode não refletir todos os conflitos ativos listados em outras seções.
        </span>
      </div>

      {isLoading && <LoadingSpinner text="Analisando notícias e gerando resumo..." />}
      {error && <ErrorDisplay message={error} />}
      
      {summary && !isLoading && (
        // Removed ScrollArea component
        <div className="flex-grow"> 
          <div className="p-1 md:p-3 bg-card rounded-lg shadow-md space-y-6 text-sm">
            
            {summary.resumoGeral && (
              <div>
                <h3 className="font-semibold text-lg mb-2 text-accent border-b pb-2">Resumo Geral dos Eventos:</h3>
                <p className="whitespace-pre-wrap text-foreground/90">{summary.resumoGeral}</p>
              </div>
            )}
            
            {summary.eventosChave && summary.eventosChave.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-1 text-accent">Eventos Chave:</h4>
                <ul className="list-disc list-inside ml-4 space-y-0.5 text-foreground/90">
                  {summary.eventosChave.map((evento, index) => <li key={`evento-${index}`}>{evento}</li>)}
                </ul>
              </div>
            )}
            {summary.atoresEnvolvidos && summary.atoresEnvolvidos.length > 0 && (
              <div>
                <h4 className="font-semibold text-base mb-1 text-accent">Atores Envolvidos:</h4>
                 <ul className="list-disc list-inside ml-4 space-y-0.5 text-foreground/90">
                  {summary.atoresEnvolvidos.map((ator, index) => <li key={`ator-${index}`}>{ator}</li>)}
                </ul>
              </div>
            )}
            {summary.impactoHumanitario && summary.impactoHumanitario !== "Não mencionado explicitamente" && summary.impactoHumanitario !== "Não mencionado explicitamente nas notícias fornecidas" && (
              <div>
                <h4 className="font-semibold text-base mb-1 text-accent">Impacto Humanitário:</h4>
                <p className="whitespace-pre-wrap text-foreground/90">{summary.impactoHumanitario}</p>
              </div>
            )}
             {summary.causasFatoresMencionados && summary.causasFatoresMencionados !== "Não mencionado explicitamente" && summary.causasFatoresMencionados !== "Não mencionado explicitamente nas notícias fornecidas" && (
              <div>
                <h4 className="font-semibold text-base mb-1 text-accent">Causas/Fatores Mencionados:</h4>
                <p className="whitespace-pre-wrap text-foreground/90">{summary.causasFatoresMencionados}</p>
              </div>
            )}
            {(!summary.resumoGeral && (!summary.eventosChave || summary.eventosChave.length === 0)) && (
                <p className="text-muted-foreground">Não foi possível extrair informações detalhadas das notícias fornecidas para esta análise.</p>
            )}
          </div>
        </div>
      )}
      {!summary && !isLoading && !error && (
         <p className="text-sm text-muted-foreground text-center flex-grow flex items-center justify-center">
           Clique no botão acima para gerar um resumo das notícias da BBC e ReliefWeb.
         </p>
      )}
    </div>
  );
}
