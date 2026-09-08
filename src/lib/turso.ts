import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

export const turso = url
  ? createClient({ url, ...(authToken ? { authToken } : {}) })
  : null;

export async function ensureTursoSchema() {
  if (!turso) return false;
  await turso.execute(`CREATE TABLE IF NOT EXISTS ai_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_data TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )`);
  try {
    await turso.execute("ALTER TABLE ai_summaries ADD COLUMN input_hash TEXT NOT NULL DEFAULT ''");
  } catch {
    // Column already exists on databases initialized with the current schema.
  }
  try {
    await turso.execute("ALTER TABLE ai_summaries ADD COLUMN summary_version INTEGER NOT NULL DEFAULT 1");
  } catch {
    // Column already exists on databases initialized with the current schema.
  }
  await turso.execute(`CREATE TABLE IF NOT EXISTS conflict_snapshots (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    snapshot_data TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )`);
  return true;
}
