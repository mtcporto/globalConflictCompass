"use client";

import { useCallback, useEffect, useState } from 'react';
import { DatabaseZap, ExternalLink, Info, RefreshCw, Sparkles } from 'lucide-react';
import { getAiSummaryAction } from '@/app/actions';
import type { SourceStatus } from '@/lib/types';
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from './error-display';
import { LoadingSpinner } from './loading-spinner';
import { formatDate } from '@/lib/utils';

interface AiSummaryPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

function TextList({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return <ul className="space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul>;
}

export function AiSummaryPanel({ onStatusChange }: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<SummarizeConflictNewsOutput | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'db' | 'ai' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const result = await getAiSummaryAction(forceRefresh);
      if (result.error) throw new Error(result.error);
      setSummary(result.summary || null);
      setLastGenerated(result.lastGenerated || null);
      setDataSource(result.dataSource || null);
      onStatusChange({ status: 'success' });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Erro desconhecido ao carregar o resumo.';
      setError(message);
      onStatusChange({ status: 'error', message });
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
        <div>
          <p className="font-medium">Leitura editorial das atualizações recentes</p>
          <p className="text-xs text-muted-foreground">O resumo é salvo no Turso por 24 horas para evitar chamadas desnecessárias ao GPT.</p>
        </div>
        <Button onClick={() => void loadSummary(true)} disabled={isLoading} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Atualizando…' : 'Atualizar resumo'}
        </Button>
      </div>

      {lastGenerated && <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {dataSource === 'db' ? <DatabaseZap className="h-3.5 w-3.5 text-emerald-600" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
        <span>{dataSource === 'db' ? 'Carregado do Turso' : 'Gerado pelo GPT-4o'} · {formatDate(lastGenerated)} às {new Date(lastGenerated).toLocaleTimeString('pt-BR')}</span>
      </div>}

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>A análise usa até cinco itens relevantes de cada fonte disponível. Ela resume o noticiário; não substitui a fonte original nem a lista de conflitos.</span>
      </div>

      {isLoading && <LoadingSpinner text="Consultando o resumo salvo ou analisando as notícias…" />}
      {error && <ErrorDisplay message={error} />}

      {summary && !isLoading && <article className="space-y-6 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Panorama</p>
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/90">{summary.panorama || summary.resumoGeral}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <section><h3 className="mb-3 font-semibold">Principais desenvolvimentos</h3><TextList items={summary.eventosChave} /></section>
          <section><h3 className="mb-3 font-semibold">Conflitos em destaque</h3><TextList items={summary.conflitosEmDestaque} /></section>
          <section><h3 className="mb-3 font-semibold">Impacto humanitário</h3><p className="leading-6 text-foreground/85">{summary.impactoHumanitario || 'Não mencionado explicitamente nas notícias fornecidas.'}</p></section>
          <section><h3 className="mb-3 font-semibold">Atores e fatores</h3><div className="space-y-3 leading-6 text-foreground/85"><TextList items={summary.atoresEnvolvidos} />{summary.causasFatoresMencionados && <p>{summary.causasFatoresMencionados}</p>}</div></section>
        </div>
        {summary.oQueAcompanhar?.length ? <section className="border-t pt-5"><h3 className="mb-3 font-semibold">O que acompanhar</h3><TextList items={summary.oQueAcompanhar} /></section> : null}
        {summary.fontes?.length ? <section className="border-t pt-5"><h3 className="mb-3 font-semibold">Fontes usadas</h3><ul className="space-y-2 text-sm">{summary.fontes.map((source, index) => <li key={`${source.link || source.title}-${index}`}><a className="inline-flex items-center gap-1 text-primary hover:underline" href={source.link} target="_blank" rel="noreferrer">{source.source}: {source.title}<ExternalLink className="h-3 w-3" /></a></li>)}</ul></section> : null}
      </article>}
    </div>
  );
}
