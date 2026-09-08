
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import type { CachedAiSummary } from '@/lib/types';
import { ensureTursoSchema, turso } from './turso';

export async function addAiSummaryToTurso(summary: SummarizeConflictNewsOutput, inputHash: string, version = 2): Promise<void> {
  try {
    if (!turso) return;
    await ensureTursoSchema();
    await turso.execute({
      sql: 'INSERT INTO ai_summaries (summary_data, input_hash, generated_at, summary_version) VALUES (?, ?, ?, ?)',
      args: [JSON.stringify(summary), inputHash, new Date().toISOString(), version],
    });
  } catch (error) {
    console.error('Failed to add AI summary to Turso:', error);
    throw error; // Re-throw para ser tratado pelo chamador
  }
}

export async function getLatestAiSummaryFromTurso(inputHash?: string, minimumVersion = 1): Promise<CachedAiSummary | null> {
  try {
    if (!turso) return null;
    await ensureTursoSchema();
    const result = await turso.execute({
      sql: inputHash
        ? 'SELECT summary_data, generated_at FROM ai_summaries WHERE input_hash = ? AND summary_version >= ? ORDER BY generated_at DESC LIMIT 1'
        : 'SELECT summary_data, generated_at FROM ai_summaries WHERE summary_version >= ? ORDER BY generated_at DESC LIMIT 1',
      args: inputHash ? [inputHash, minimumVersion] : [minimumVersion],
    });
    const row = result.rows[0] as { summary_data?: string; generated_at?: string } | undefined;
    if (!row?.summary_data || !row.generated_at) return null;
    return { summary: JSON.parse(row.summary_data) as SummarizeConflictNewsOutput, lastGenerated: row.generated_at };
  } catch (error) {
    console.error('Failed to get latest AI summary from Turso:', error);
    // Não relance o erro aqui para permitir que a lógica de fallback gere um novo resumo
    return null;
  }
}
