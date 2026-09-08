'use server';

import { z } from 'zod';
import { openai, OPENAI_MODEL } from '@/ai/openai';
import type { WikipediaConflictsData } from '@/lib/types';

const SOURCE_URL = 'https://en.wikipedia.org/wiki/List_of_ongoing_armed_conflicts';

const ConflictSchema = z.object({
  id: z.string().optional(), name: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']).optional(),
  fatalitiesRaw: z.string().optional(), locations: z.array(z.string()).optional(),
  startDate: z.string().optional(), territory: z.string().optional(),
  detailsLink: z.string().optional(), imageUrl: z.string().optional(),
  latitude: z.number().nullable().optional(), longitude: z.number().nullable().optional(),
});

const OutputSchema = z.object({ conflicts: z.array(ConflictSchema) });

export type ExtractWikipediaConflictsOutput = z.infer<typeof OutputSchema>;
export type ExtractWikipediaConflictsInput = Record<string, never>;

export async function extractWikipediaConflicts(): Promise<WikipediaConflictsData> {
  const response = await fetch(SOURCE_URL, { next: { revalidate: 21600 } });
  if (!response.ok) throw new Error(`Wikipedia respondeu ${response.status}.`);
  const html = await response.text();
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)]
    .map(match => match[0])
    .filter(table => /10,000|1,000|100[–-]999/.test(table));
  const text = tables.map((table, index) => `TABLE ${index + 1}. CATEGORY: ${index === 0 ? 'HIGH (10,000 OR MORE DEATHS)' : index === 1 ? 'MEDIUM (1,000 TO 9,999 DEATHS)' : 'LOW (100 TO 999 DEATHS)'}\n${table}`).join('\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .slice(0, 120000);
  if (!text.trim()) throw new Error('A página da Wikipedia não retornou as tabelas de conflitos esperadas.');

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Retorne somente JSON válido, sem Markdown, no formato {"conflicts":[{"name":"...","severity":"HIGH","fatalitiesRaw":"...","locations":[]}]}. Extraia todos os conflitos armados ativos das tabelas e classifique cada conflito pela categoria TABLE em que ele aparece: HIGH, MEDIUM ou LOW. Preserve os números da fonte e não invente dados.' },
      { role: 'user', content: `Fonte: ${SOURCE_URL}\nConteúdo extraído:\n${text}` },
    ],
    response_format: { type: 'json_object' },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('O GPT não retornou conflitos estruturados.');
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('O GPT não retornou JSON de conflitos válido.');
  const raw = OutputSchema.parse(JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)));
  const parsed = {
    conflicts: raw.conflicts.map((conflict, index) => ({
      ...conflict,
      id: conflict.id || `${conflict.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${index}`,
      severity: conflict.severity || 'UNKNOWN',
      fatalitiesRaw: conflict.fatalitiesRaw || 'Não informado pela fonte',
      locations: conflict.locations || [],
    })),
  };
  if (parsed.conflicts.length === 0) throw new Error('A IA não conseguiu extrair conflitos das tabelas atuais da Wikipedia.');
  return { ...parsed, sourcePage: SOURCE_URL, lastUpdated: new Date().toISOString() } as WikipediaConflictsData;
}
