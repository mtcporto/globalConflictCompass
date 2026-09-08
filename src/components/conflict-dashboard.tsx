
// src/components/conflict-dashboard.tsx
"use client";

import type React from 'react';
import { useState, useCallback, useMemo }from 'react';
import type { AllApiStatuses, ApiName, SourceStatus } from '@/lib/types';
import { DataCard } from './data-card';
import { BbcNewsPanel } from './bbc-news-panel';
import { AlJazeeraNewsPanel } from './aljazeera-news-panel';
import { HrwReportsPanel } from './hrw-reports-panel';
import { GuardianNewsPanel } from './guardian-news-panel'; // Added
import { AiSummaryPanel } from './ai-summary-panel';
import { WikipediaMacroPanel } from './wikipedia-macro-panel';
import { Newspaper, Globe, Sparkles, AlertTriangle, CheckCircle2, Loader2, BookOpen, Landmark } from 'lucide-react';

const initialApiStatuses: AllApiStatuses = {
  acled: { status: 'idle', message: 'Temporariamente oculto.' },
  reliefweb: { status: 'idle', message: 'Temporariamente oculto.' },
  bbc: { status: 'loading' },
  aljazeera: { status: 'loading' },
  hrw: { status: 'loading' },
  guardian: { status: 'loading' }, // Added
  aiSummary: { status: 'idle' },
  wikipediaConflicts: { status: 'success' }, 
};

export default function ConflictDashboard() {
  const [apiStatuses, setApiStatuses] = useState<AllApiStatuses>(initialApiStatuses);
  const [fetchTriggers, setFetchTriggers] = useState<Record<ApiName, number>>({
    acled: 0, reliefweb: 0, bbc: 0, aljazeera: 0, hrw: 0, guardian: 0, // Added guardian
    aiSummary: 0, wikipediaConflicts: 0,
  });

  const handleBbcStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, bbc: status }));
  }, []);
  const handleAlJazeeraStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, aljazeera: status }));
  }, []);
  const handleHrwStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, hrw: status }));
  }, []);
  const handleGuardianStatusChange = useCallback((status: SourceStatus) => { // Added
    setApiStatuses(prev => ({ ...prev, guardian: status }));
  }, []);
  const handleAiSummaryStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, aiSummary: status }));
  }, []);

  const handleRefresh = (source: ApiName) => {
    setFetchTriggers(prev => ({ ...prev, [source]: prev[source] + 1 }));
  };
  
  const overallStatus = useMemo(() => {
    const statuses = [apiStatuses.bbc, apiStatuses.aljazeera, apiStatuses.hrw, apiStatuses.guardian, apiStatuses.aiSummary];
    const total = statuses.length;
    const successCount = statuses.filter(s => s.status === 'success').length;
    const errorCount = statuses.filter(s => s.status === 'error').length;
    const loadingCount = statuses.filter(s => s.status === 'loading').length;
    const idleCount = statuses.filter(s => s.status === 'idle').length;

    if (loadingCount > 0) {
      return { text: `Carregando ${loadingCount} fonte(s) de dados...`, icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-blue-600 bg-blue-100" };
    }
    if (errorCount > 0) {
      return { text: `${errorCount} fonte(s) com erro. ${successCount + idleCount} funcionando/ociosa(s).`, icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600 bg-red-100" };
    }
    if (successCount + idleCount === total && total > 0) {
         return { text: `Todas as fontes de dados operacionais.`, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600 bg-green-100"};
    }
    if (total === 0) {
        return { text: "Nenhuma fonte de dados configurada.", icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-600 bg-yellow-100"};
    }
    return { text: "Verificando status das fontes...", icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-gray-600 bg-gray-100"};

  }, [apiStatuses]);

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
          <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
          Global Conflict Compass
        </h1>
        <p className="text-muted-foreground mt-2">Monitor de Conflitos Armados Globais</p>
      </header>
      
      <div className="mb-8">
        <DataCard
            title="Visão Macro dos Conflitos"
            icon={BookOpen}
            className="lg:col-span-3" 
            disableMaxHeight={true}
          >
            <WikipediaMacroPanel />
          </DataCard>
      </div>

      <section className="mt-10">
      <div className="mb-4 text-center"><h2 className="text-2xl font-semibold text-foreground">Atualizações recentes</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Notícias e relatórios ajudam a acompanhar os acontecimentos recentes. A lista de conflitos e o mapa continuam baseados na fonte principal indicada acima.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataCard 
          title="BBC News" 
          icon={Newspaper}
          onRefresh={() => handleRefresh('bbc')}
          isLoading={apiStatuses.bbc.status === 'loading'}
        >
          <BbcNewsPanel 
            onStatusChange={handleBbcStatusChange}
            triggerFetch={fetchTriggers.bbc}
          />
        </DataCard>

        <DataCard 
          title="Al Jazeera" 
          icon={Newspaper}
          onRefresh={() => handleRefresh('aljazeera')}
          isLoading={apiStatuses.aljazeera.status === 'loading'}
        >
          <AlJazeeraNewsPanel 
            onStatusChange={handleAlJazeeraStatusChange}
            triggerFetch={fetchTriggers.aljazeera}
          />
        </DataCard>
        
        <DataCard 
          title="The Guardian" 
          icon={Newspaper}
          onRefresh={() => handleRefresh('guardian')}
          isLoading={apiStatuses.guardian.status === 'loading'}
        >
          <GuardianNewsPanel 
            onStatusChange={handleGuardianStatusChange}
            triggerFetch={fetchTriggers.guardian}
          />
        </DataCard>


        <DataCard 
          title="Human Rights Watch" 
          icon={Landmark}
          onRefresh={() => handleRefresh('hrw')}
          isLoading={apiStatuses.hrw.status === 'loading'}
        >
          <HrwReportsPanel 
            onStatusChange={handleHrwStatusChange}
            triggerFetch={fetchTriggers.hrw}
          />
        </DataCard>
        
        
        <div className={`status-bar p-3 rounded-md text-sm flex items-center justify-center gap-2 ${overallStatus.color} border border-current/30 shadow-sm md:col-span-2 lg:col-span-3`}>
          {overallStatus.icon}
          <span>{overallStatus.text}</span>
        </div>

        <DataCard 
          title="Resumo por IA (BBC, Al Jazeera, HRW, The Guardian)"
          icon={Sparkles}
          className="md:col-span-2 lg:col-span-3" 
          disableMaxHeight={true}
        >
          <AiSummaryPanel onStatusChange={handleAiSummaryStatusChange} />
        </DataCard>
      </div>
      </section>
    </div>
  );
}
