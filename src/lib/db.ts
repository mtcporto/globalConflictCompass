
'use server';

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import type { CachedAiSummary } from '@/lib/types';

const DB_DIR = path.join(process.cwd(), '.db');
const DB_PATH = path.join(DB_DIR, 'history.sqlite');

// Ensure the .db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database.Database;

try {
  db = new Database(DB_PATH); // verbose: console.log would log statements
  console.log('SQLite DB connection established/opened at', DB_PATH);

  // Initialize table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_data TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );
  `);
  console.log('ai_summaries table checked/created.');
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
  // If DB connection fails, subsequent operations will throw errors,
  // which should be handled by the calling functions.
}


export function addAiSummary(summary: SummarizeConflictNewsOutput): void {
  if (!db) {
    console.error('DB not initialized, cannot add summary.');
    throw new Error('Database not initialized.');
  }
  try {
    const stmt = db.prepare('INSERT INTO ai_summaries (summary_data, generated_at) VALUES (?, ?)');
    const now = new Date().toISOString();
    stmt.run(JSON.stringify(summary), now);
    console.log('AI Summary added to DB at', now);
  } catch (error) {
    console.error('Failed to add AI summary to DB:', error);
    throw error; // Re-throw to be handled by caller
  }
}

export function getLatestAiSummary(): CachedAiSummary | null {
  if (!db) {
    console.error('DB not initialized, cannot get latest summary.');
    return null; // Or throw, depending on desired error handling
  }
  try {
    const stmt = db.prepare('SELECT summary_data, generated_at FROM ai_summaries ORDER BY generated_at DESC LIMIT 1');
    const row = stmt.get() as { summary_data: string; generated_at: string } | undefined;

    if (row) {
      console.log('Latest AI Summary fetched from DB, generated at:', row.generated_at);
      return {
        summary: JSON.parse(row.summary_data) as SummarizeConflictNewsOutput,
        lastGenerated: row.generated_at,
      };
    }
    console.log('No AI Summary found in DB.');
    return null;
  } catch (error) {
    console.error('Failed to get latest AI summary from DB:', error);
    return null; // Or throw
  }
}

// Note: The better-sqlite3 documentation suggests creating a new Database instance for each transaction 
// or keeping a single instance open for the lifetime of the application if concurrency is not an issue
// and the environment supports it (e.g. not strictly serverless without shared filesystem).
// For Next.js server actions/components, a new instance per operation or per request might be safer 
// in some deployment scenarios, but for simplicity and local dev, a module-level instance is often used.
// If deploying to a serverless environment, this DB strategy would need rethinking (e.g. Turso, LibSQL).
// We are keeping the DB connection open for the lifetime of this module for simplicity in this prototype.
// If issues arise, one could wrap each db operation (prepare, run, get) in its own db connection.
process.on('exit', () => {
  if (db && db.open) {
    db.close();
    console.log('SQLite DB connection closed.');
  }
});
