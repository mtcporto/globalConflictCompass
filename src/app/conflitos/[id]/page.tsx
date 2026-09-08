import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, MapPin, Newspaper, Skull, Users } from 'lucide-react';
import Link from 'next/link';
import { getConflictSnapshot } from '@/lib/conflict-cache';
import { getRelatedConflictNews } from '@/lib/conflict-news';
import { getTranslatedWikipediaSummaries, getWikipediaSummaries } from '@/lib/wikipedia';
import type { WikipediaConflict } from '@/lib/types';

function severityLabel(value: WikipediaConflict['severity']) {
  return value === 'HIGH' ? 'Alta gravidade' : value === 'MEDIUM' ? 'Média gravidade' : value === 'LOW' ? 'Baixa gravidade' : 'Não classificada';
}

function cleanText(value: string) {
  return value.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

export default async function ConflictDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getConflictSnapshot();
  const conflict = snapshot?.data.conflicts.find(item => item.id === decodeURIComponent(id));
  if (!conflict) notFound();

  const summaries = await getWikipediaSummaries(conflict.wikipediaLinks || []);
  const [news, translatedSummaries] = await Promise.all([
    getRelatedConflictNews(conflict),
    getTranslatedWikipediaSummaries(conflict.id, summaries),
  ]);

  return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-950 hover:underline"><ArrowLeft className="h-4 w-4" />Voltar ao panorama</Link>
    <header className="mb-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"><div className="mb-4 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">O que está acontecendo aqui</p><h1 className="text-3xl font-bold tracking-tight">{conflict.name}</h1></div><span className="rounded-full border px-3 py-1 text-sm font-medium">{severityLabel(conflict.severity)}</span></div><p className="max-w-3xl text-base leading-7 text-muted-foreground">A lista da Wikipédia agrupa este item como uma família ou frente de conflitos. Abaixo estão os conflitos específicos, o contexto traduzido das páginas relacionadas e as atualizações jornalísticas encontradas.</p><div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3"><p className="flex items-start gap-2"><Skull className="mt-0.5 h-4 w-4 shrink-0" />{conflict.fatalitiesRaw}</p><p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0" />{conflict.locations.join(', ') || 'Localização não informada'}</p><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{conflict.latitude != null && conflict.longitude != null ? 'Representado no mapa' : 'Sem coordenada disponível'}</p></div></header>

    <section className="mb-6 rounded-2xl border bg-card p-6 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Atualizações relacionadas</h2><p className="text-sm text-muted-foreground">A notícia mais recente aparece em destaque; as demais ficam abaixo.</p></div><Newspaper className="h-5 w-5 text-primary" /></div>{news.length ? <><article className="rounded-xl border-l-4 border-primary bg-muted/30 p-5"><p className="text-xs font-medium text-muted-foreground">{news[0].source} · {news[0].pubDate ? new Date(news[0].pubDate).toLocaleDateString('pt-BR') : 'Data não informada'}</p><h3 className="mt-2 text-xl font-semibold leading-7">{news[0].title}</h3><p className="mt-2 max-w-3xl leading-7 text-muted-foreground">{cleanText(news[0].description || news[0].content).slice(0, 420)}{(news[0].description || news[0].content).length > 420 ? '…' : ''}</p><a href={news[0].link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-950 hover:underline">Abrir notícia <ExternalLink className="h-3 w-3" /></a></article>{news.length > 1 && <div className="mt-4 grid gap-4 md:grid-cols-2">{news.slice(1).map((item, index) => <article key={`${item.guid}-${item.source}-${index}`} className="border-t pt-3"><p className="text-xs text-muted-foreground">{item.source} · {item.pubDate ? new Date(item.pubDate).toLocaleDateString('pt-BR') : 'Data não informada'}</p><h3 className="mt-1 font-medium leading-5">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{cleanText(item.description || item.content).slice(0, 260)}…</p><a href={item.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-950 hover:underline">Abrir notícia <ExternalLink className="h-3 w-3" /></a></article>)}</div>}</> : <p className="text-sm text-muted-foreground">Nenhuma atualização relacionada foi encontrada nas fontes disponíveis.</p>}</section>

    <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border bg-card p-6 shadow-sm"><h2 className="mb-4 text-xl font-semibold">Conflitos relacionados</h2>{conflict.wikipediaLinks?.length ? <div className="space-y-3">{conflict.wikipediaLinks.map(link => <div key={`${link.url}-${link.depth}`} className="flex items-start gap-3" style={{ paddingLeft: `${Math.min(link.depth, 4) * 1.25}rem` }}><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><a href={link.url} target="_blank" rel="noreferrer" className="font-medium text-sky-700 hover:text-sky-950 hover:underline">{link.title}<ExternalLink className="ml-1 inline h-3 w-3" /></a><p className="text-xs text-muted-foreground">Página relacionada na Wikipédia</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">A fonte não forneceu links individuais para este agrupamento.</p>}<p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">Fonte do agrupamento e da classificação: <a className="font-medium text-sky-700 underline hover:text-sky-950" href="https://en.wikipedia.org/wiki/List_of_ongoing_armed_conflicts" target="_blank" rel="noreferrer">lista de conflitos em andamento da Wikipédia</a>.</p></section>
      <section className="rounded-2xl border bg-card p-6 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold">Contexto das páginas</h2><p className="text-xs text-muted-foreground">Tradução salva no Turso após a primeira consulta.</p></div></div>{translatedSummaries.length ? <div className="space-y-5">{translatedSummaries.map((summary, index) => <article key={`${summary.link || summary.title}-${index}`}><h3 className="font-semibold">{summary.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{summary.translatedExtract}</p><a href={summary.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-950 hover:underline">Ler a página original <ExternalLink className="h-3 w-3" /></a></article>)}</div> : <p className="text-sm text-muted-foreground">Não foi possível carregar o contexto das páginas individuais agora.</p>}</section>
    </div>
  </div></main>;
}
