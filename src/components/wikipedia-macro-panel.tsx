
"use client";

import type React from 'react';
import { useMemo } from 'react'; // Keep useMemo for calculations
import Image from 'next/image';
import type { CuratedConflictEntry, CuratedConflictData, ConflictSeverityCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  MapPin,
  CalendarDays,
  Users,
  AlertOctagon,
  ShieldAlert,
  TrendingUp,
  Globe,
  Info,
  BarChart3,
  Activity,
  UsersRound,
  MessageSquareWarning,
  TrendingDown,
  LocateFixed,
  Map as MapIcon,
  CalendarClock,
  Landmark,
  Scale,
  Route,
  AlertTriangle,
  Handshake,
  HelpCircle,
  Sigma, // For Total Conflicts
  Skull,   // For Fatalities
  Network, // For Actors
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dynamic from 'next/dynamic';
import curatedConflictDataJson from '@/data/curated-conflict-data.json';

const MapDisplay = dynamic(() => import('./map-display'), {
  ssr: false,
  loading: () => <div className="h-[700px] w-full bg-muted/30 rounded-lg flex items-center justify-center"><p className="text-muted-foreground">Carregando mapa...</p></div>,
});

const severityIconMap: Record<ConflictSeverityCategory, React.ElementType> = {
  "Alta Gravidade": AlertOctagon,
  "Média Gravidade": ShieldAlert,
  "Baixa Gravidade": TrendingUp,
};

const severityColorClasses: Record<ConflictSeverityCategory, string> = {
  "Alta Gravidade": "text-red-500",
  "Média Gravidade": "text-orange-500",
  "Baixa Gravidade": "text-yellow-500",
};

const fallbackImageUrl = `https://placehold.co/600x400/eeeeee/cccccc?text=Imagem+Indispon%C3%ADvel`;

const fieldDisplayConfig: Array<{ key: keyof CuratedConflictEntry; label: string; icon: React.ElementType, isList?: boolean }> = [
  { key: 'inicio', label: 'Início', icon: CalendarDays },
  { key: 'fatalidades_texto', label: 'Fatalidades (Estimativa)', icon: Skull },
  { key: 'data_ultima_atualizacao_fatalidades', label: 'Últ. Info Fatalidades', icon: CalendarClock },
  { key: 'territorio', label: 'Território Principal', icon: LocateFixed },
  { key: 'status', label: 'Status', icon: Activity },
  { key: 'tipo_conflito', label: 'Tipo', icon: BarChart3 },
  { key: 'impacto_humanitario', label: 'Impacto Humanitário', icon: UsersRound },
  { key: 'atores_externos_envolvidos', label: 'Atores Externos', icon: Handshake, isList: true },
  { key: 'tendencia_recente', label: 'Tendência Recente', icon: TrendingDown },
  { key: 'fonte_dados_especifica', label: 'Fontes Adicionais', icon: Landmark },
  { key: 'regiao_geopolitica', label: 'Região Geopolítica', icon: Globe },
];


export function WikipediaMacroPanel() {
  const data: CuratedConflictData = curatedConflictDataJson as CuratedConflictData;

  const allConflicts = useMemo(() => {
    const conflicts: CuratedConflictEntry[] = [];
    (Object.keys(data) as ConflictSeverityCategory[]).forEach(severityKey => {
      data[severityKey].forEach(conflict => {
        conflicts.push({ ...conflict, severityCategory: severityKey });
      });
    });
    return conflicts;
  }, [data]);

  const totalActiveConflicts = useMemo(() => allConflicts.length, [allConflicts]);

  const totalFatalities = useMemo(() => {
    return allConflicts.reduce((sum, conflict) => {
      // Usa fatalidades_reportadas se for um número, senão tenta extrair de fatalidades_texto
      let fatalities = 0;
      if (typeof conflict.fatalidades_reportadas === 'number') {
        fatalities = conflict.fatalidades_reportadas;
      } else if (typeof conflict.fatalidades_texto === 'string') {
        const match = conflict.fatalidades_texto.replace(/[,.+]/g, '').match(/\d+/);
        if (match) {
          fatalities = parseInt(match[0], 10);
        }
      }
      return sum + fatalities;
    }, 0);
  }, [allConflicts]);

  const activeGeopoliticalRegions = useMemo(() => {
    const regions = new Set<string>();
    allConflicts.forEach(conflict => {
      if (conflict.regiao_geopolitica) {
        regions.add(conflict.regiao_geopolitica);
      }
    });
    return Array.from(regions).sort();
  }, [allConflicts]);

  const involvedActorsInMultipleConflicts = useMemo(() => {
    const actorCounts: Record<string, number> = {};
    allConflicts.forEach(conflict => {
      conflict.envolvidos?.forEach(actor => {
        actorCounts[actor] = (actorCounts[actor] || 0) + 1;
      });
    });
    return Object.entries(actorCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([actor, count]) => `${actor} (${count})`);
  }, [allConflicts]);


  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== fallbackImageUrl) {
      target.src = fallbackImageUrl;
    }
  };

  if (!data) {
    return <div className="p-4 text-center text-muted-foreground">Carregando dados dos conflitos...</div>;
  }
  
  const conflictCategories = Object.keys(data) as ConflictSeverityCategory[];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-foreground">Mapa Global de Conflitos</h3>
      </div>

      <div className="mb-6 h-[700px] w-full">
        <MapDisplay conflicts={allConflicts} />
      </div>
      
      {/* Mini Dashboard Section */}
      <div className="mb-8 p-4 border bg-card rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Panorama Numérico dos Conflitos Atuais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-md">
            <Sigma className="w-7 h-7 text-primary mb-1" />
            <span className="font-semibold text-xl">{totalActiveConflicts}</span>
            <span className="text-muted-foreground text-xs">Total de Conflitos Ativos</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-md">
            <Skull className="w-7 h-7 text-destructive mb-1" />
            <span className="font-semibold text-xl">{totalFatalities.toLocaleString('pt-BR')}</span>
            <span className="text-muted-foreground text-xs">Total Estimado de Fatalidades</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-md">
            <Globe className="w-7 h-7 text-accent mb-1" />
            <span className="font-semibold text-xl">{activeGeopoliticalRegions.length}</span>
            <span className="text-muted-foreground text-xs">Regiões Geopolíticas Ativas</span>
            {activeGeopoliticalRegions.length > 0 && (
                 <div className="text-xs text-muted-foreground mt-1 text-center opacity-80">({activeGeopoliticalRegions.slice(0,3).join(', ')}{activeGeopoliticalRegions.length > 3 ? ', ...' : ''})</div>
            )}
          </div>
          <div className="flex flex-col items-center p-3 bg-muted/50 rounded-md">
            <Network className="w-7 h-7 text-orange-500 mb-1" />
            <span className="font-semibold text-xl">{involvedActorsInMultipleConflicts.length}</span>
            <span className="text-muted-foreground text-xs">Atores em Múltiplos Conflitos</span>
            {involvedActorsInMultipleConflicts.length > 0 && (
                 <div className="text-xs text-muted-foreground mt-1 text-center opacity-80">({involvedActorsInMultipleConflicts.slice(0,2).join(', ')}{involvedActorsInMultipleConflicts.length > 2 ? ', ...' : ''})</div>
            )}
          </div>
        </div>
      </div>


      <h3 className="text-xl font-semibold text-foreground mb-3">Visão Macro dos Conflitos</h3>
      <Accordion type="multiple" className="w-full">
        {conflictCategories.map((severityKey) => {
          const conflictsInCategory = data[severityKey];
          if (!conflictsInCategory || conflictsInCategory.length === 0) return null;

          const IconComponent = severityIconMap[severityKey];
          const iconColorClass = severityColorClasses[severityKey];

          return (
            <AccordionItem value={severityKey} key={severityKey}>
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  {IconComponent && <IconComponent className={`w-5 h-5 ${iconColorClass}`} />}
                  {severityKey} ({conflictsInCategory.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap justify-center gap-4">
                  {conflictsInCategory.map((conflict) => (
                    <div
                      key={conflict.nome}
                      className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-lg transition-shadow max-w-[350px] w-full sm:w-auto flex flex-col"
                    >
                      <div className="relative w-full h-48 mb-3 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={conflict.imagem_url || fallbackImageUrl}
                          alt={`Imagem do conflito: ${conflict.nome}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="bg-muted"
                          onError={handleImageError}
                          data-ai-hint="war impact armed conflict"
                        />
                      </div>
                      <h4 className="font-semibold text-base mb-1.5">{conflict.nome}</h4>

                      {fieldDisplayConfig.map(field => {
                        let value = conflict[field.key as keyof CuratedConflictEntry];
                        if (field.key === 'envolvidos' || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0) ) return null;
                        
                        if (Array.isArray(value)) {
                          value = value.join('; '); // Simple join for arrays
                        }

                        return (
                          <p key={field.key} className="text-xs text-muted-foreground mb-0.5 flex items-start gap-1.5">
                            <field.icon className="w-3.5 h-3.5 mt-0.5 text-primary/80 shrink-0" />
                            <span><strong>{field.label}:</strong> {String(value)}</span>
                          </p>
                        );
                      })}
                      
                      {conflict.envolvidos && conflict.envolvidos.length > 0 && (
                        <div className="mt-1.5 mb-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Users className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                            <strong>Principais Envolvidos:</strong>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {conflict.envolvidos.map(ator => <Badge key={ator} variant="secondary" className="text-xs">{ator}</Badge>)}
                          </div>
                        </div>
                      )}
                      
                      {conflict.wikipedia_link && (
                        <a
                          href={conflict.wikipedia_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-auto pt-2"
                        >
                          Ver detalhes na Wikipedia <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="mt-8 p-3 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground text-center italic">
        <p>
          Dados apresentados são curados manualmente e baseados no arquivo <code>src/data/curated-conflict-data.json</code>.
        </p>
        <p className="mt-1">
          Este painel é para fins informativos e educacionais.
        </p>
      </div>
    </div>
  );
}
