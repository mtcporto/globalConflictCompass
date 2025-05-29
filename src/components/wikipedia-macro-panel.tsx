
"use client";

import type React from 'react';
import Image from 'next/image';
import type { CuratedConflictEntry, CuratedConflictData, WikipediaConflictSeverity } from '@/lib/types'; // WikipediaConflictSeverity will be inferred by Zod
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, CalendarDays, Users, AlertOctagon, TrendingUp, ShieldAlert, Globe, Info, BarChart3, Activity, UsersRound, MessageSquareWarning, TrendingDown, LocateFixed, Map, CalendarClock, Landmark, Scale, Route, AlertTriangle, Handshake, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dynamic from 'next/dynamic';
import curatedConflictData from '@/data/curated-conflict-data.json'; // Importar diretamente

const MapDisplay = dynamic(() => import('./map-display'), {
  ssr: false,
  loading: () => <div className="h-[400px] md:h-[600px] w-full bg-muted/30 rounded-lg flex items-center justify-center"><p className="text-muted-foreground">Carregando mapa...</p></div>,
});

// Tradução dos níveis de severidade para o cabeçalho do AccordionTrigger
const severityTranslationMap: Record<string, string> = {
  "Alta Gravidade": "Alta Gravidade (Fatalidades Anuais > 10.000 Estimadas)",
  "Média Gravidade": "Média Gravidade (Fatalidades Anuais 1.000-9.999 Estimadas)",
  "Baixa Gravidade": "Baixa Gravidade (Fatalidades Anuais 100-999 Estimadas)",
};

const severityIconMap: Record<string, React.ElementType | null> = {
  "Alta Gravidade": AlertOctagon,
  "Média Gravidade": ShieldAlert,
  "Baixa Gravidade": TrendingUp,
};

// Cores baseadas nas classes Tailwind para consistência, mas usadas para ícones aqui
const severityColorClasses: Record<string, string> = {
  "Alta Gravidade": "text-red-500",
  "Média Gravidade": "text-orange-500",
  "Baixa Gravidade": "text-yellow-500",
};

const fallbackImageUrl = `https://placehold.co/600x400.png?text=Imagem+Indispon%C3%ADvel`;

// Mapeamento de campos para ícones e rótulos
const fieldDisplayConfig = [
  { key: 'inicio', label: 'Início', icon: CalendarDays },
  { key: 'fatalidades_texto', label: 'Fatalidades (Reportado)', icon: AlertTriangle },
  { key: 'data_ultima_atualizacao_fatalidades', label: 'Última Atualização Fatalidades', icon: CalendarClock },
  { key: 'territorio', label: 'Território Principal', icon: LocateFixed },
  // { key: 'coordenadas', label: 'Coords.', icon: Globe }, // Coordenadas já estão no mapa
  { key: 'status', label: 'Status', icon: Activity },
  { key: 'tipo_conflito', label: 'Tipo de Conflito', icon: BarChart3 },
  { key: 'impacto_humanitario', label: 'Impacto Humanitário', icon: UsersRound },
  { key: 'atores_externos_envolvidos', label: 'Atores Externos', icon: Handshake },
  { key: 'tendencia_recente', label: 'Tendência Recente', icon: TrendingDown },
  { key: 'fonte_dados_especifica', label: 'Fontes Específicas', icon: Landmark },
  { key: 'regiao_geopolitica', label: 'Região Geopolítica', icon: Map },
];


export function WikipediaMacroPanel() {
  const data: CuratedConflictData = curatedConflictData as CuratedConflictData;

  const allConflicts: CuratedConflictEntry[] = Object.values(data).flat();
  const severityOrder = ["Alta Gravidade", "Média Gravidade", "Baixa Gravidade"];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-foreground">Mapa Global de Conflitos</h3>
      </div>

      <div className="mb-6 h-[500px] md:h-[700px] w-full"> {/* Aumentar altura do mapa */}
        <MapDisplay
          key={JSON.stringify(allConflicts)} // Força recriação se os dados mudarem
          conflicts={allConflicts || []}
        />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Visão Macro dos Conflitos</h3>
      <Accordion type="multiple" className="w-full">
        {severityOrder.map((severityKey) => {
          const conflictsInCategory = data[severityKey as keyof CuratedConflictData];
          if (!conflictsInCategory || conflictsInCategory.length === 0) return null;

          const translatedSeverity = severityTranslationMap[severityKey] || severityKey;
          const IconComponent = severityIconMap[severityKey];
          const iconColorClass = severityColorClasses[severityKey];

          return (
            <AccordionItem value={severityKey} key={severityKey}>
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  {IconComponent && <IconComponent className={`w-5 h-5 ${iconColorClass}`} />}
                  {translatedSeverity} ({conflictsInCategory.length})
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
                          data-ai-hint="war impact armed conflict"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== fallbackImageUrl) {
                              target.src = fallbackImageUrl;
                            }
                          }}
                        />
                      </div>
                      <h4 className="font-semibold text-base mb-1.5">{conflict.nome}</h4>

                      {fieldDisplayConfig.map(field => {
                        const value = conflict[field.key as keyof CuratedConflictEntry];
                        if (value) {
                          return (
                            <p key={field.key} className="text-xs text-muted-foreground mb-0.5 flex items-start gap-1.5">
                              <field.icon className="w-3.5 h-3.5 mt-0.5 text-primary/80 shrink-0" />
                              <span><strong>{field.label}:</strong> {String(value)}</span>
                            </p>
                          );
                        }
                        return null;
                      })}
                      
                      {conflict.envolvidos && conflict.envolvidos.length > 0 && (
                        <div className="mt-1.5 mb-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
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
          Dados apresentados são curados manualmente e podem não refletir todas as atualizações em tempo real. Fatalidades são estimativas baseadas em diversas fontes.
        </p>
        <p className="mt-1">
          Este painel é para fins informativos e educacionais.
        </p>
      </div>
    </div>
  );
}

    