"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CalendarClock, ExternalLink, MapPin, Search, Skull, Users, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CuratedConflictEntry, WikipediaConflict, WikipediaConflictsData } from '@/lib/types';

const MapDisplay = dynamic(() => import('./map-display'), {
  ssr: false,
  loading: () => <div className="flex h-[700px] items-center justify-center rounded-lg bg-slate-900 text-sm text-slate-300">Carregando mapa…</div>,
});

const SOURCE_URL = 'https://en.wikipedia.org/wiki/List_of_ongoing_armed_conflicts';

function severityLabel(value: WikipediaConflict['severity']) {
  return value === 'HIGH' ? 'Alta' : value === 'MEDIUM' ? 'Média' : value === 'LOW' ? 'Baixa' : 'Não classificada';
}

function severityClass(value: WikipediaConflict['severity']) {
  return value === 'HIGH' ? 'border-red-200 bg-red-50 text-red-800' : value === 'MEDIUM' ? 'border-orange-200 bg-orange-50 text-orange-800' : value === 'LOW' ? 'border-yellow-200 bg-yellow-50 text-yellow-800' : 'border-slate-200 bg-slate-50 text-slate-700';
}

function toMapConflict(c: WikipediaConflict): CuratedConflictEntry | null {
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return null;
  const severityCategory = c.severity === 'HIGH' ? 'Alta Gravidade' : c.severity === 'MEDIUM' ? 'Média Gravidade' : c.severity === 'LOW' ? 'Baixa Gravidade' : undefined;
  return { nome: c.name, imagem_url: '', inicio: c.startDate || '', fatalidades_texto: c.fatalitiesRaw, territorio: c.territory || '', coordenadas: [c.latitude, c.longitude], envolvidos: c.locations, wikipedia_link: c.detailsLink || SOURCE_URL, status: 'Ativo', tipo_conflito: 'Conflito armado', data_ultima_atualizacao_fatalidades: 'Conforme a fonte original', impacto_humanitario: '', atores_externos_envolvidos: '', tendencia_recente: '', fonte_dados_especifica: SOURCE_URL, regiao_geopolitica: '', severityCategory };
}

export function WikipediaMacroPanel() {
  const [data, setData] = useState<WikipediaConflictsData | null>(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<'ALL' | WikipediaConflict['severity']>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/conflicts${forceRefresh ? '?refresh=1' : ''}`);
      const result = await response.json() as WikipediaConflictsData & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || 'Não foi possível carregar os conflitos.');
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os conflitos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredConflicts = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return data.conflicts.filter(conflict => {
      const matchesQuery = !normalizedQuery || `${conflict.name} ${conflict.locations.join(' ')}`.toLowerCase().includes(normalizedQuery);
      return matchesQuery && (severity === 'ALL' || conflict.severity === severity);
    });
  }, [data, query, severity]);

  const mapped = useMemo(() => filteredConflicts.map(toMapConflict).filter((item): item is CuratedConflictEntry => item !== null), [filteredConflicts]);

  function selectConflict(conflict: WikipediaConflict) {
    setSelectedId(conflict.name);
    document.getElementById(`conflict-${conflict.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (loading) return <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">Carregando dados atuais da fonte…</div>;
  if (error) return <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Tentar novamente</Button></div>;
  if (!data) return null;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-xl font-semibold">Conflitos armados em andamento</h3><p className="text-sm text-muted-foreground">Panorama baseado na lista da Wikipédia; use os links para consultar o contexto completo.</p></div>
      <Button onClick={() => void load(true)} variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Atualizar fonte</Button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Fonte processada em {new Date(data.lastUpdated).toLocaleString('pt-BR')}</span><a className="inline-flex items-center gap-1 underline" href={SOURCE_URL} target="_blank" rel="noreferrer">Abrir Wikipédia <ExternalLink className="h-3 w-3" /></a></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-4"><strong className="block text-2xl">{data.conflicts.length}</strong><span className="text-xs text-muted-foreground">Conflitos na fonte</span></div><div className="rounded-lg border p-4"><strong className="block text-2xl">{data.conflicts.filter(c => c.latitude != null && c.longitude != null).length}</strong><span className="text-xs text-muted-foreground">Com posição no mapa</span></div><div className="rounded-lg border p-4"><strong className="block text-2xl">{data.conflicts.filter(c => c.severity === 'HIGH').length}</strong><span className="text-xs text-muted-foreground">Classificados como alta gravidade</span></div></div>
    <MapDisplay conflicts={mapped} selectedConflictId={selectedId} onSelectConflict={name => { const conflict = data.conflicts.find(item => item.name === name); if (conflict) selectConflict(conflict); }} />
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Explorar conflitos</h3><p className="text-xs text-muted-foreground">{filteredConflicts.length} de {data.conflicts.length} exibidos · clique em um item para localizá-lo no mapa</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant={severity === 'ALL' ? 'default' : 'outline'} onClick={() => setSeverity('ALL')}>Todos</Button>{(['HIGH', 'MEDIUM', 'LOW'] as const).map(value => <Button key={value} size="sm" variant={severity === value ? 'default' : 'outline'} onClick={() => setSeverity(value)}>{severityLabel(value)}</Button>)}</div></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por conflito ou país…" className="pl-9" /></div></div>
    {filteredConflicts.length === 0 ? <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhum conflito corresponde aos filtros.</p> : <div className="grid gap-3 md:grid-cols-2">{filteredConflicts.map(c => <article id={`conflict-${c.id}`} key={c.id} onClick={() => selectConflict(c)} className={`cursor-pointer rounded-lg border p-4 transition hover:border-primary/60 hover:shadow-sm ${selectedId === c.name ? 'border-primary ring-2 ring-primary/20' : 'bg-card'}`}><div className="mb-2 flex items-start justify-between gap-2"><h4 className="font-semibold leading-5">{c.name}</h4><Badge className={severityClass(c.severity)}>{severityLabel(c.severity)}</Badge></div><p className="mb-2 flex gap-2 text-sm text-muted-foreground"><Skull className="h-4 w-4 shrink-0" />{c.fatalitiesRaw}</p><p className="mb-2 flex gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4 shrink-0" />{c.locations.join(', ') || 'Localização não informada'}</p>{c.startDate && <p className="mb-3 text-xs text-muted-foreground">Início: {c.startDate}</p>}<div className="flex flex-wrap gap-x-4 gap-y-2 text-xs"><Link className="text-primary underline" href={`/conflitos/${c.id}`} onClick={event => event.stopPropagation()}>Ver o que acontece aqui</Link><a className="inline-flex items-center gap-1 text-primary underline" href={c.detailsLink || SOURCE_URL} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>Fonte Wikipédia <ExternalLink className="h-3 w-3" /></a></div></article>)}</div>}
  </div>;
}
