
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { WikipediaConflictsData, WikipediaConflict, WikipediaConflictSeverity, SourceStatus } from '@/lib/types';
import { getWikipediaConflictsAction } from '@/app/actions';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, CalendarDays, AlertOctagon } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface WikipediaMacroPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

const severityMap: Record<WikipediaConflictSeverity, { label: string; color: string; icon?: React.ElementType }> = {
  HIGH: { label: "Gravidade Alta (10.000+ mortes/ano)", color: "bg-red-500 hover:bg-red-600", icon: AlertOctagon },
  MEDIUM: { label: "Gravidade Média (1.000-9.999 mortes/ano)", color: "bg-orange-500 hover:bg-orange-600", icon: AlertOctagon },
  LOW: { label: "Gravidade Baixa (100-999 mortes/ano)", color: "bg-yellow-500 hover:bg-yellow-600", icon: AlertOctagon },
  UNKNOWN: { label: "Gravidade Desconhecida", color: "bg-gray-500 hover:bg-gray-600" },
};

export function WikipediaMacroPanel({ onStatusChange }: WikipediaMacroPanelProps) {
  const [conflictsData, setConflictsData] = useState<WikipediaConflictsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const result = await getWikipediaConflictsAction();
      if (result.error) {
        throw new Error(result.error);
      }
      setConflictsData(result.data || null);
      if (!result.data || result.data.conflicts.length === 0) {
        onStatusChange({ status: 'success', message: 'Nenhum conflito ativo encontrado nas principais categorias da Wikipedia.' });
      } else {
        onStatusChange({ status: 'success' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados da Wikipedia.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("Wikipedia data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) return <LoadingSpinner text="Carregando dados de conflitos da Wikipedia..." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!conflictsData || conflictsData.conflicts.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">Nenhum conflito ativo encontrado nas principais categorias da Wikipedia ou falha ao processar dados.</p>;
  }

  const groupedConflicts = conflictsData.conflicts.reduce((acc, conflict) => {
    const severity = conflict.severity || 'UNKNOWN';
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(conflict);
    return acc;
  }, {} as Record<WikipediaConflictSeverity, WikipediaConflict[]>);

  const severityOrder: WikipediaConflictSeverity[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <p>
          Dados extraídos da página{" "}
          <a href={conflictsData.sourcePage} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
            "List of ongoing armed conflicts"
          </a>{" "}
          da Wikipedia (em inglês).
          Última atualização (processamento): {new Date(conflictsData.lastUpdated).toLocaleString('pt-BR')}.
        </p>
        <p className="mt-1 text-xs">
            Nota: A extração é feita por IA e pode conter imprecisões. A gravidade é baseada nas categorias de fatalidades da Wikipedia.
        </p>
      </div>
      <ScrollArea className="flex-grow">
        <Accordion type="multiple" defaultValue={['HIGH', 'MEDIUM']} className="w-full">
          {severityOrder.map((severityKey) => {
            const conflicts = groupedConflicts[severityKey];
            if (!conflicts || conflicts.length === 0) return null;
            
            const severityInfo = severityMap[severityKey];
            const IconComponent = severityInfo.icon;

            return (
              <AccordionItem value={severityKey} key={severityKey}>
                <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                  <div className="flex items-center gap-2">
                    {IconComponent && <IconComponent className={`w-5 h-5 ${severityInfo.color.replace('bg-', 'text-')}`} />}
                    {severityInfo.label} ({conflicts.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {conflicts.map((conflict) => (
                      <div key={conflict.id} className="p-3 border rounded-md shadow-sm bg-card hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-base mb-1">{conflict.name}</h4>
                        <div className="text-xs text-muted-foreground space-y-0.5 mb-1">
                          {conflict.startDate && (
                            <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Início: {conflict.startDate}</p>
                          )}
                          <p className="flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Fatalidades (Reportado): {conflict.fatalitiesRaw}</p>
                          {conflict.territory && (
                            <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Território Específico: {conflict.territory}</p>
                          )}
                        </div>
                        {conflict.locations && conflict.locations.length > 0 && (
                           <div className="mb-1.5">
                             <span className="text-xs font-medium">Locais/Grupos Envolvidos: </span>
                             {conflict.locations.map(loc => <Badge key={loc} variant="secondary" className="mr-1 mb-1 text-xs">{loc}</Badge>)}
                           </div>
                        )}
                        {conflict.detailsLink && (
                          <a
                            href={conflict.detailsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
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
      </ScrollArea>
       {/* Placeholder for future map */}
       <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2">Mapa Global de Conflitos</h3>
            <p className="text-sm text-muted-foreground">Visualização em mapa (Leaflet) será implementada aqui.</p>
            <div data-ai-hint="world map conflict" className="my-4 h-48 w-full bg-gray-300 rounded flex items-center justify-center text-gray-500">
                [Espaço reservado para o mapa]
            </div>
        </div>
    </div>
  );
}

