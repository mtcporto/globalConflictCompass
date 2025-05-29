
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { CuratedConflictEntry, CuratedConflictData, ConflictSeverityCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, CalendarDays, Users, AlertOctagon, ShieldAlert, TrendingUp, Globe, Info, BarChart3, Activity, UsersRound, MessageSquareWarning, TrendingDown, LocateFixed, Map as MapIcon, CalendarClock, Landmark, Scale, Route, AlertTriangle, Handshake, HelpCircle, RefreshCw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dynamic from 'next/dynamic';
import curatedConflictDataJson from '@/data/curated-conflict-data.json'; // Importar diretamente
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';

const MapDisplay = dynamic(() => import('./map-display'), {
  ssr: false,
  loading: () => <div className="h-[600px] md:h-[700px] w-full bg-muted/30 rounded-lg flex items-center justify-center"><p className="text-muted-foreground">Carregando mapa...</p></div>,
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

const fieldDisplayConfig: Array<{ key: keyof CuratedConflictEntry; label: string; icon: React.ElementType }> = [
  { key: 'inicio', label: 'Início', icon: CalendarDays },
  { key: 'fatalidades_texto', label: 'Fatalidades (Reportado)', icon: AlertTriangle },
  { key: 'data_ultima_atualizacao_fatalidades', label: 'Última Atualização Fatalidades', icon: CalendarClock },
  { key: 'territorio', label: 'Território Principal', icon: LocateFixed },
  { key: 'status', label: 'Status', icon: Activity },
  { key: 'tipo_conflito', label: 'Tipo de Conflito', icon: BarChart3 },
  { key: 'impacto_humanitario', label: 'Impacto Humanitário', icon: UsersRound },
  { key: 'atores_externos_envolvidos', label: 'Atores Externos', icon: Handshake },
  { key: 'tendencia_recente', label: 'Tendência Recente', icon: TrendingDown },
  { key: 'fonte_dados_especifica', label: 'Fontes Específicas', icon: Landmark },
  { key: 'regiao_geopolitica', label: 'Região Geopolítica', icon: MapIcon },
];

export function WikipediaMacroPanel() {
  // Directly use the imported JSON data
  const data: CuratedConflictData = curatedConflictDataJson;

  // Flatten all conflicts into a single array for the map, adding severityCategory
  const allConflictsWithSeverity: CuratedConflictEntry[] = [];
  (Object.keys(data) as ConflictSeverityCategory[]).forEach(severityKey => {
    data[severityKey].forEach(conflict => {
      allConflictsWithSeverity.push({ ...conflict, severityCategory: severityKey });
    });
  });

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== fallbackImageUrl) {
      target.src = fallbackImageUrl;
    }
  };
  
  if (!data) {
    return <LoadingSpinner text="Carregando dados dos conflitos..." />;
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-foreground">Mapa Global de Conflitos</h3>
      </div>

      <div className="mb-6 h-[600px] md:h-[700px] w-full">
        <MapDisplay
          key={allConflictsWithSeverity.length > 0 ? 'map-loaded' : 'map-empty'} // Ensure re-render if conflicts appear/disappear
          conflicts={allConflictsWithSeverity}
        />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Visão Macro dos Conflitos</h3>
      <Accordion type="multiple" className="w-full">
        {(Object.keys(data) as ConflictSeverityCategory[]).map((severityKey) => {
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
                      key={conflict.nome} // Assuming 'nome' is unique
                      className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-lg transition-shadow max-w-[350px] w-full sm:w-auto flex flex-col"
                    >
                      <div className="relative w-full h-48 mb-3 rounded-md overflow-hidden bg-muted">
                        <Image
                          src={conflict.imagem_url || fallbackImageUrl}
                          alt={`Imagem do conflito: ${conflict.nome}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="bg-muted"
                          data-ai-hint="war impact armed conflict"
                          onError={handleImageError}
                        />
                      </div>
                      <h4 className="font-semibold text-base mb-1.5">{conflict.nome}</h4>

                      {fieldDisplayConfig.map(field => {
                        const value = conflict[field.key as keyof CuratedConflictEntry];
                         // For array types like 'envolvidos', we handle them separately below
                        if (field.key === 'envolvidos' || !value) return null;

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
