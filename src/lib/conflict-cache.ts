import type { WikipediaConflictsData } from '@/lib/types';
import { ensureTursoSchema, turso } from './turso';

export async function getConflictSnapshot() {
  if (!turso) return null;
  await ensureTursoSchema();
  const result = await turso.execute('SELECT snapshot_data, generated_at FROM conflict_snapshots WHERE id = 1 LIMIT 1');
  const row = result.rows[0] as { snapshot_data?: string; generated_at?: string } | undefined;
  if (!row?.snapshot_data || !row.generated_at) return null;
  return { data: JSON.parse(row.snapshot_data) as WikipediaConflictsData, generatedAt: row.generated_at };
}

export async function saveConflictSnapshot(data: WikipediaConflictsData) {
  if (!turso) return;
  await ensureTursoSchema();
  await turso.execute({
    sql: `INSERT INTO conflict_snapshots (id, snapshot_data, generated_at) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET snapshot_data = excluded.snapshot_data, generated_at = excluded.generated_at`,
    args: [JSON.stringify(data), data.lastUpdated],
  });
}
