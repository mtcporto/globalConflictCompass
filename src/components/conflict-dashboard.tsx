"use client";

import type React from 'react';
import { useState, useCallback, useMemo }from 'react';
import type { AllApiStatuses, ApiName, SourceStatus } from '@/lib/types';
import { DataCard } from './data-card';
import { AcledPanel } from './acled-panel';
import { ReliefWebPanel } from './reliefweb-panel';
import { BbcNewsPanel } from './bbc-news-panel';
import { GpiPanel } from './gpi-panel';
import { AiSummaryPanel } from './ai-summary-panel';
import { BarChartBig, Globe, HelpingHand, Newspaper, ShieldCheck, Sparkles, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const initialApiStatuses: AllApiStatuses = {
  acled: { status: 'loading' },
  reliefweb: { status: 'loading' },
  bbc: { status: 'loading' },
  gpi: { status: 'idle' }, // GPI is static or pre-loaded
  aiSummary: { status: 'idle' }, // AI Summary is user-triggered
};

export default function ConflictDashboard() {
  const [apiStatuses, setApiStatuses] = useState<AllApiStatuses>(initialApiStatuses);
  // Trigger state for refreshing individual panels
  const [fetchTriggers, setFetchTriggers] = useState<Record<ApiName, number>>({
    acled: 0, reliefweb: 0, bbc: 0, gpi: 0, aiSummary: 0,
  });

  const handleStatusChange = useCallback((source: ApiName, status: SourceStatus) => {
    setApiStatuses(prev => ({ ...prev, [source]: status }));
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
      return { text: `${errorCount} fonte(s) com erro. ${successCount} funcionando.`, icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600 bg-red-100" };
    }
    if (successCount + idleCount === total) {
         return { text: `Todas as fontes de dados operacionais.`, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600 bg-green-100"};
    }
    return { text: "Verificando status das fontes...", icon: <Loader2 className="h-4 w-4 animate-spin" />, color: "text-gray-600 bg-gray-100"};

  }, [apiStatuses]);

  // Memoized callbacks for each panel
  const handleAcledStatusChange = useCallback((status: SourceStatus) => {
    handleStatusChange('acled', status);
  }, [handleStatusChange]);

  const handleReliefWebStatusChange = useCallback((status: SourceStatus) => {
    handleStatusChange('reliefweb', status);
  }, [handleStatusChange]);

  const handleBbcStatusChange = useCallback((status: SourceStatus) => {
    handleStatusChange('bbc', status);
  }, [handleStatusChange]);

  const handleGpiStatusChange = useCallback((status: SourceStatus) => {
    handleStatusChange('gpi', status);
  }, [handleStatusChange]);

  const handleAiSummaryStatusChange = useCallback((status: SourceStatus) => {
    handleStatusChange('aiSummary', status);
  }, [handleStatusChange]);


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
          <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
          Global Conflict Compass
        </h1>
        <p className="text-muted-foreground mt-2">Conflitos Globais em Tempo Real</p>
      </header>

      <div className={`status-bar p-3 mb-8 rounded-md text-sm flex items-center justify-center gap-2 ${overallStatus.color} border border-current/30 shadow-sm`}>
        {overallStatus.icon}
        <span>{overallStatus.text}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataCard 
          title="ACLED" 
          icon={BarChartBig} 
          onRefresh={() => handleRefresh('acled')}
          isLoading={apiStatuses.acled.status === 'loading'}
          className="lg:col-span-1"
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
          className="lg:col-span-1"
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
          className="lg:col-span-1"
        >
          <BbcNewsPanel 
            onStatusChange={handleBbcStatusChange}
            triggerFetch={fetchTriggers.bbc}
          />
        </DataCard>
        
        <DataCard 
          title="Global Peace Index" 
          icon={ShieldCheck}
          // No refresh for GPI as it's static in this version
          className="md:col-span-1"
        >
          <GpiPanel onStatusChange={handleGpiStatusChange} />
        </DataCard>

        <DataCard 
          title="Resumo por IA" 
          icon={Sparkles}
          // AI summary has its own trigger button inside the panel
          className="md:col-span-2 lg:col-span-2"
        >
          <AiSummaryPanel onStatusChange={handleAiSummaryStatusChange} />
        </DataCard>
      </div>
    </div>
  );
}
