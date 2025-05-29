
"use client";

import type React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { 
  getAiSummaryAction, 
  fetchBbcNewsForAISummary, 
  fetchReliefWebForAISummary,
  fetchAlJazeeraForAISummary,
  fetchHrwReportsForAISummary,
  fetchGuardianNewsForAISummary
} from '@/app/actions';
import type { SourceStatus, SummarizeNewsInputItem, BbcNewsItemRss, ReliefWebReport } from '@/lib/types';
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { Wand2, Info, AlertTriangle, DatabaseZap } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AiSummaryPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

export function AiSummaryPanel({ onStatusChange }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<SummarizeConflictNewsOutput | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'db' | 'ai' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    if (forceRefresh) { // Only clear previous summary if forcing a full refresh
        setSummary(null);
        setLastGenerated(null);
        setDataSource(null);
    }
    onStatusChange({ status: 'loading' });

    try {
      // Fetch news items only if we need to generate a new summary (forceRefresh or no valid cache/DB entry)
      // The decision to fetch fresh news or use DB cache is now inside getAiSummaryAction
      const newsFetchPromises = [
        fetchBbcNewsForAISummary(5), 
        fetchReliefWebForAISummary(5),
        fetchAlJazeeraForAISummary(5),
        fetchHrwReportsForAISummary(5),
        fetchGuardianNewsForAISummary(5)
      ];

      const results = await Promise.all(newsFetchPromises);
      const [bbcData, reliefWebData, alJazeeraData, hrwData, guardianData] = results;

      const newsItemsToSummarize: SummarizeNewsInputItem[] = [];
      const processItems = (items: Array<BbcNewsItemRss | ReliefWebReport>, sourceName: string) => {
        items.forEach((item: any) => { 
          let title: string;
          let description: string;
          let link: string | undefined;

          if (sourceName === 'ReliefWeb') { // Assuming ReliefWeb items have 'fields'
            title = item.fields.title;
            description = item.fields.body?.replace(/<[^>]*>?/gm, '').substring(0, 350) + '...' || 'Sem descrição detalhada.';
            link = item.fields.url;
          } else { // Assuming other sources (BBC, Al Jazeera, HRW, Guardian) have a common structure
            title = item.title;
            description = (item.content || item.description || "").replace(/<[^>]*>?/gm, '').substring(0, 350) + '...';
            link = item.link;
          }
          newsItemsToSummarize.push({ title, description, link });
        });
      };

      processItems(bbcData, 'BBC');
      processItems(reliefWebData, 'ReliefWeb');
      processItems(alJazeeraData, 'AlJazeera');
      processItems(hrwData, 'HRW');
      processItems(guardianData, 'The Guardian');
      
      if (newsItemsToSummarize.length === 0 && forceRefresh) {
        // Only error out if forcing refresh and no news. If not forcing, getAiSummaryAction might return from DB.
        setError("Nenhuma notícia encontrada para gerar o resumo. Verifique as fontes de notícias.");
        onStatusChange({ status: 'error', message: "Nenhuma notícia para resumir." });
        setIsLoading(false);
        return;
      }
      
      // Pass newsItemsToSummarize, action will decide if they are needed based on forceRefresh and DB state
      const result = await getAiSummaryAction(newsItemsToSummarize, forceRefresh);

      if (result.error) {
        throw new Error(result.error);
      }
      
      setSummary(result.summary || null);
      setLastGenerated(result.lastGenerated || null);
      setDataSource(result.dataSource || null);
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
    // Generate summary on initial load, try to use DB cache first
    generateSummary(false); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  return (
    <div className="flex flex-col h-full">
      <Button onClick={() => generateSummary(true)} disabled={isLoading} className="mb-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        <Wand2 className="mr-2 h-4 w-4" />
        {isLoading ? 'Analisando Notícias e Gerando Resumo...' : 'Atualizar Resumo Agora'}
      </Button>
      
      {lastGenerated && (
        <div className={`mb-3 text-xs text-center ${dataSource === 'db' ? 'text-green-600' : 'text-blue-600'} flex items-center justify-center gap-1.5 p-1.5 bg-muted/50 rounded-md border`}>
          {dataSource === 'db' ? <DatabaseZap className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
          <span>
            Resumo {dataSource === 'db' ? 'carregado do banco de dados' : 'gerado pela IA'}. Última geração: {formatDate(lastGenerated)} às {new Date(lastGenerated).toLocaleTimeString('pt-BR')}.
          </span>
        </div>
      )}

      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Este resumo é gerado por IA com base nas notícias mais recentes de fontes como BBC, ReliefWeb, Al Jazeera, Human Rights Watch e The Guardian (até 5 de cada). 
          Pode não refletir todos os conflitos ativos listados em outras seções.
        </span>
      </div>

      {isLoading && <LoadingSpinner text="Analisando notícias e gerando resumo..." />}
      {error && <ErrorDisplay message={error} />}
      
      {summary && !isLoading && (
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
          {summary.impactoHumanitario && summary.impactoHumanitario !== "Não mencionado explicitamente nas notícias fornecidas" && (
            <div>
              <h4 className="font-semibold text-base mb-1 text-accent">Impacto Humanitário:</h4>
              <p className="whitespace-pre-wrap text-foreground/90">{summary.impactoHumanitario}</p>
            </div>
          )}
           {summary.causasFatoresMencionados && summary.causasFatoresMencionados !== "Não mencionado explicitamente nas notícias fornecidas" && (
            <div>
              <h4 className="font-semibold text-base mb-1 text-accent">Causas/Fatores Mencionados:</h4>
              <p className="whitespace-pre-wrap text-foreground/90">{summary.causasFatoresMencionados}</p>
            </div>
          )}
          {(!summary.resumoGeral && (!summary.eventosChave || summary.eventosChave.length === 0)) && (
              <p className="text-muted-foreground">Não foi possível extrair informações detalhadas das notícias fornecidas para esta análise.</p>
          )}
        </div>
      )}
      {!summary && !isLoading && !error && (
         <p className="text-sm text-muted-foreground text-center flex-grow flex items-center justify-center">
           Clique no botão "Atualizar Resumo Agora" para gerar um novo resumo das notícias ou aguarde o carregamento inicial.
         </p>
      )}
    </div>
  );
}
