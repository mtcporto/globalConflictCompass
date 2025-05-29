
// src/components/conflict-dashboard.tsx
"use client";

import type React from 'react';
import { useState, useCallback, useMemo }from 'react';
import type { AllApiStatuses, ApiName, SourceStatus } from '@/lib/types';
import { DataCard } from './data-card';
import { AcledPanel } from './acled-panel';
import { ReliefWebPanel } from './reliefweb-panel';
import { BbcNewsPanel } from './bbc-news-panel';
import { AlJazeeraNewsPanel } from './aljazeera-news-panel';
import { HrwReportsPanel } from './hrw-reports-panel';
import { AiSummaryPanel } from './ai-summary-panel';
import { WikipediaMacroPanel } from './wikipedia-macro-panel';
import { BarChartBig, Globe, HelpingHand, Newspaper, Sparkles, AlertTriangle, CheckCircle2, Loader2, BookOpen, Landmark } from 'lucide-react';

const initialApiStatuses: AllApiStatuses = {
  acled: { status: 'loading' },
  reliefweb: { status: 'loading' },
  bbc: { status: 'loading' },
  aljazeera: { status: 'loading' },
  hrw: { status: 'loading' },
  aiSummary: { status: 'idle' },
  wikipediaConflicts: { status: 'success' }, // Since it's local JSON, assume success
};

export default function ConflictDashboard() {
  const [apiStatuses, setApiStatuses] = useState<AllApiStatuses>(initialApiStatuses);
  const [fetchTriggers, setFetchTriggers] = useState<Record<ApiName, number>>({
    acled: 0, reliefweb: 0, bbc: 0, aljazeera: 0, hrw: 0,
    aiSummary: 0, wikipediaConflicts: 0,
  });

  const handleAcledStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, acled: status }));
  }, []);
  const handleReliefWebStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, reliefweb: status }));
  }, []);
  const handleBbcStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, bbc: status }));
  }, []);
  const handleAlJazeeraStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, aljazeera: status }));
  }, []);
  const handleHrwStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, hrw: status }));
  }, []);
  const handleAiSummaryStatusChange = useCallback((status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, aiSummary: status }));
  }, []);

  const handleRefresh = (source: ApiName) => {
    setFetchTriggers(prev => ({ ...prev, [source]: prev[source] + 1 }));
  };
  
  const overallStatus = useMemo(() => {
    const statuses = Object.values(apiStatuses);
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

      <h2 className="text-2xl font-semibold text-foreground mb-4 mt-10 text-center">Fontes de Notícias e Dados Adicionais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataCard 
          title="ACLED" 
          icon={BarChartBig} 
          onRefresh={() => handleRefresh('acled')}
          isLoading={apiStatuses.acled.status === 'loading'}
        >
          <AcledPanel 
            onStatusChange={handleAcledStatusChange}
            triggerFetch={fetchTriggers.acled}
          />
        </DataCard>

        <DataCard 
          title="ReliefWeb" 
          icon={HelpingHand}
          onRefresh={() => handleRefresh('reliefweb')}
          isLoading={apiStatuses.reliefweb.status === 'loading'}
        >
          <ReliefWebPanel 
            onStatusChange={handleReliefWebStatusChange}
            triggerFetch={fetchTriggers.reliefweb}
          />
        </DataCard>

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
        
        {/* Status bar moved here, spanning full width of this grid section */}
        <div className={`status-bar p-3 rounded-md text-sm flex items-center justify-center gap-2 ${overallStatus.color} border border-current/30 shadow-sm md:col-span-2 lg:col-span-3`}>
          {overallStatus.icon}
          <span>{overallStatus.text}</span>
        </div>

        <DataCard 
          title="Resumo por IA (BBC, Al Jazeera, HRW, ReliefWeb)" 
          icon={Sparkles}
          className="md:col-span-2 lg:col-span-3" 
          disableMaxHeight={true}
        >
          <AiSummaryPanel onStatusChange={handleAiSummaryStatusChange} />
        </DataCard>
      </div>
    </div>
  );
}
