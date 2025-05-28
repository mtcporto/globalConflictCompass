
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
        setError(result.error); // Show error but still display cached data if available
        onStatusChange({ status: 'success', message: `Exibindo dados de cache. ${result.error}` });
      } else if (!result.data || result.data.conflicts.length === 0 && !result.error){ 
        setConflictsData(result.data || null); 
        onStatusChange({ status: 'success', message: 'Nenhum conflito ativo encontrado nas principais categorias da Wikipedia.' });
      } else { 
         setConflictsData(result.data || null);
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
  
  // Display error if it exists and there's no data to show (or if not refreshing)
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
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Tentando Atualizar...' : 'Tentar Atualizar Dados'}
        </Button>
      </div>
    );
  }
  
  if (!isLoading && !isRefreshing && (!conflictsData || conflictsData.conflicts.length === 0) && !error) {
    return (
      <div className="p-4 text-center">
         <p className="text-sm text-muted-foreground mb-4">Nenhum conflito ativo encontrado nas principais categorias da Wikipedia ou falha ao processar dados.</p>
        <Button 
            onClick={() => fetchData(true)} 
            disabled={isRefreshing || isLoading}
            variant="outline"
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Tentando Atualizar...' : 'Tentar Atualizar Dados'}
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
        {conflictsData?.sourcePage && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex-grow min-w-[300px]">
            <p>
              Dados extraídos da página{" "}
              <a href={conflictsData.sourcePage} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                "List of ongoing armed conflicts"
              </a>{" "}
              da Wikipedia (em inglês).
              Última atualização do cache (processamento): {conflictsData.lastUpdated ? new Date(conflictsData.lastUpdated).toLocaleString('pt-BR') : 'N/A'}.
            </p>
            <p className="mt-1 text-xs">
                Nota: A extração é feita por IA e pode conter imprecisões, incluindo coordenadas geográficas. A gravidade é baseada nas categorias de fatalidades da Wikipedia. O cache é atualizado a cada 24 horas ou manualmente.
            </p>
          </div>
        )}
        <Button 
            onClick={() => fetchData(true)} 
            disabled={isRefreshing || isLoading}
            variant="outline"
            className="ml-auto md:ml-4 shrink-0"
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            {isRefreshing || isLoading ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>
      
      {/* Display error prominently if it occurred, even if showing cached data */}
      {error && conflictsData && conflictsData.conflicts.length > 0 && ( 
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-700">
            <p><strong>Aviso ao atualizar dados:</strong> {error}</p>
        </div>
      )}
      
      {isRefreshing && <LoadingSpinner text="Atualizando dados da Wikipedia..." />}

      {/* Only render accordion and map if not loading initially AND ( (there is data) OR (there's no error implying we should show cached data despite an update error) ) */}
      {(!isLoading || isRefreshing) && conflictsData && conflictsData.conflicts && conflictsData.conflicts.length > 0 && (
        <>
          <Accordion type="multiple" defaultValue={['HIGH', 'MEDIUM']} className="w-full mb-6">
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
                            <p className="flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Fatalidades (Reportado): {conflict.fatalidadesRaw}</p>
                            {conflict.territory && (
                              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Território Específico: {conflict.territory}</p>
                            )}
                            { (conflict.latitude && conflict.longitude) && (
                              <p className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Coordenadas (Aprox.): {conflict.latitude.toFixed(2)}, {conflict.longitude.toFixed(2)}
                              </p>
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
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3 text-center text-foreground">Mapa Global de Conflitos (Wikipedia)</h3>
            <MapDisplay
              conflicts={conflictsData?.conflicts || []}
            />
          </div>
        </>
      )}
    </div>
  );
}

