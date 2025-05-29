
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { WikipediaConflictsData, WikipediaConflict, WikipediaConflictSeverity, SourceStatus } from '@/lib/types';
import { getWikipediaConflictsAction } from '@/app/actions';
import { LoadingSpinner } from './loading-spinner';
import { ErrorDisplay } from './error-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, CalendarDays, AlertOctagon, RefreshCw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import dynamic from 'next/dynamic';

// Dynamically import MapDisplay to avoid SSR issues with Leaflet
const MapDisplay = dynamic(() => import('./map-display'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-muted/30 rounded-lg flex items-center justify-center"><p className="text-muted-foreground">Carregando mapa...</p></div>,
});


interface WikipediaMacroPanelProps {
  onStatusChange: (status: SourceStatus) => void;
}

// Tradução dos níveis de severidade para o cabeçalho do AccordionTrigger
const severityTranslationMap: Record<WikipediaConflictSeverity, string> = {
  HIGH: "Alta Gravidade (10.000+ mortes/ano)",
  MEDIUM: "Média Gravidade (1.000-9.999 mortes/ano)",
  LOW: "Baixa Gravidade (100-999 mortes/ano)",
  UNKNOWN: "Gravidade Desconhecida",
};

const severityIconMap: Record<WikipediaConflictSeverity, React.ElementType | null> = {
  HIGH: AlertOctagon,
  MEDIUM: AlertOctagon,
  LOW: AlertOctagon,
  UNKNOWN: null,
};

// Cores baseadas nas classes Tailwind para consistência, mas usadas para ícones aqui
const severityColorClasses: Record<WikipediaConflictSeverity, string> = {
  HIGH: "text-red-500",
  MEDIUM: "text-orange-500",
  LOW: "text-yellow-500",
  UNKNOWN: "text-gray-500",
};


export function WikipediaMacroPanel({ onStatusChange }: WikipediaMacroPanelProps) {
  const [conflictsData, setConflictsData] = useState<WikipediaConflictsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    onStatusChange({ status: 'loading' });
    try {
      const result = await getWikipediaConflictsAction({ forceRefresh });

      if (result.error && !result.data) {
        setError(result.error);
        onStatusChange({ status: 'error', message: result.error });
      } else if (result.error && result.data) {
        setConflictsData(result.data);
        setError(result.error); 
        onStatusChange({ status: 'success', message: `Exibindo dados de cache. ${result.error}` });
      } else if (!result.data || result.data.conflicts.length === 0 && !result.error) {
        setConflictsData(result.data || null);
        setError(null); // Clear previous errors if data is successfully fetched and empty
        onStatusChange({ status: 'success', message: 'Nenhum conflito ativo encontrado nas principais categorias da Wikipedia.' });
      } else {
        setConflictsData(result.data || null);
        setError(null); // Clear previous errors on successful data fetch
        onStatusChange({ status: 'success' });
      }

    } catch (errCaught) { 
      const errorMessage = errCaught instanceof Error ? errCaught.message : 'Erro desconhecido ao buscar dados da Wikipedia.';
      setError(errorMessage);
      onStatusChange({ status: 'error', message: errorMessage });
      console.error("Wikipedia data fetch exception (catch block):", errCaught);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (isLoading && !isRefreshing && !conflictsData && !error) {
    return <LoadingSpinner text="Carregando dados de conflitos da Wikipedia..." />;
  }

  // Exibe erro e botão de refresh se não houver dados (mesmo que o erro seja de cache)
  // ou se o erro for crítico e não houver dados do cache
  if (error && (!conflictsData || conflictsData.conflicts.length === 0) && !isRefreshing) {
    return (
      <div className="p-4 text-center">
        <ErrorDisplay message={error} />
        <Button
          onClick={() => fetchData(true)}
          disabled={isRefreshing || isLoading}
          variant="outline"
          className="mt-4"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          {isRefreshing || isLoading ? 'Tentando Atualizar...' : 'Tentar Atualizar Dados'}
        </Button>
      </div>
    );
  }

  // Mensagem de nenhum conflito encontrado (sem erro)
  if (!isLoading && !isRefreshing && (!conflictsData || conflictsData.conflicts.length === 0) && !error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">Nenhum conflito ativo encontrado nas principais categorias da Wikipedia ou falha ao processar dados.</p>
        <Button
          onClick={() => fetchData(true)}
          disabled={isRefreshing || isLoading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          {isRefreshing || isLoading ? 'Tentando Atualizar...' : 'Tentar Atualizar Dados'}
        </Button>
      </div>
    );
  }
  
  const groupedConflicts = conflictsData?.conflicts?.reduce((acc, conflict) => {
    const severity = conflict.severity || 'UNKNOWN';
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(conflict);
    return acc;
  }, {} as Record<WikipediaConflictSeverity, WikipediaConflict[]>) || {};

  const severityOrder: WikipediaConflictSeverity[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-foreground">Mapa Global de Conflitos</h3>
        <Button
          onClick={() => fetchData(true)}
          disabled={isRefreshing || isLoading}
          variant="outline"
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
          {isRefreshing || isLoading ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>
      
      {error && conflictsData && conflictsData.conflicts.length > 0 && ( 
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-700">
          <p><strong>Aviso ao atualizar dados:</strong> {error}</p>
        </div>
      )}

      {isRefreshing && <LoadingSpinner text="Atualizando dados da Wikipedia..." />}

      {/* Garante que o mapa só renderize se houver dados de conflitos (mesmo que de cache com erro) */}
      {(!isLoading || isRefreshing || (conflictsData && conflictsData.conflicts.length > 0)) && conflictsData && (
         <div className="mb-6 h-[500px] md:h-[600px] w-full">
             <MapDisplay
                key={conflictsData?.lastUpdated || 'map-initial-state'}
                conflicts={conflictsData?.conflicts || []}
             />
          </div>
      )}

      <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Visão Macro dos Conflitos</h3>
      <Accordion type="multiple" className="w-full">
        {severityOrder.map((severityKey) => {
          const conflicts = groupedConflicts[severityKey];
          if (!conflicts || conflicts.length === 0) return null;

          const translatedSeverity = severityTranslationMap[severityKey];
          const IconComponent = severityIconMap[severityKey];
          const iconColorClass = severityColorClasses[severityKey];

          return (
            <AccordionItem value={severityKey} key={severityKey}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  {IconComponent && <IconComponent className={`w-5 h-5 ${iconColorClass}`} />}
                  {translatedSeverity} ({conflicts.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4"> 
                  {conflicts.map((conflict) => (
                    <div 
                      key={conflict.id} 
                      className="p-4 border rounded-lg shadow-sm bg-card hover:shadow-lg transition-shadow max-w-[350px]"
                    >
                      <div className="relative w-full h-48 mb-3 rounded-md overflow-hidden">
                        <Image
                          src={conflict.imageUrl || `https://placehold.co/300x200.png?text=Imagem+Indispon%C3%ADvel`}
                          alt={`Imagem do conflito: ${conflict.name}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="bg-muted"
                          data-ai-hint="war impact armed conflict"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.srcset = `https://placehold.co/300x200.png?text=Erro+Imagem`;
                            target.src = `https://placehold.co/300x200.png?text=Erro+Imagem`;
                          }}
                        />
                      </div>
                      <h4 className="font-semibold text-base mb-1.5">{conflict.name}</h4>
                      <div className="text-xs text-muted-foreground space-y-0.5 mb-1.5">
                        {conflict.startDate && (
                          <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Início: {conflict.startDate}</p>
                        )}
                        <p className="flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Fatalidades (Reportado): {conflict.fatalitiesRaw}</p>
                        {conflict.territory && (
                          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Território Específico: {conflict.territory}</p>
                        )}
                        {(conflict.latitude && conflict.longitude) && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Coordenadas (Aprox.): {conflict.latitude.toFixed(2)}, {conflict.longitude.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {conflict.locations && conflict.locations.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium">Locais/Grupos Envolvidos: </span>
                          {conflict.locations.map(loc => <Badge key={loc} variant="secondary" className="mr-1 mb-1 text-xs">{loc}</Badge>)}
                        </div>
                      )}
                      {conflict.detailsLink && (
                        <a
                          href={conflict.detailsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1.5"
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
        {conflictsData?.sourcePage && (
          <p>
            Dados extraídos da página{" "}
            <a href={conflictsData.sourcePage} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-accent">
              "List of ongoing armed conflicts"
            </a>{" "}
            da Wikipedia (em inglês).
            Última atualização do cache (processamento): {conflictsData.lastUpdated ? new Date(conflictsData.lastUpdated).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}) : 'N/A'}.
          </p>
        )}
        <p className="mt-1">
          Nota: A extração é feita por IA e pode conter imprecisões, incluindo coordenadas geográficas e URLs de imagens. A gravidade é baseada nas categorias de fatalidades da Wikipedia. O cache é atualizado a cada 24 horas ou manualmente.
        </p>
      </div>
    </div>
  );
}
