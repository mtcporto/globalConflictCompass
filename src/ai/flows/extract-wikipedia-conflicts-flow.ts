'use server';

import { parseHTML } from 'linkedom';
import { z } from 'zod';
import { openai, OPENAI_MODEL } from '@/ai/openai';
import type { WikipediaConflictLink, WikipediaConflictsData } from '@/lib/types';

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

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function absoluteWikipediaUrl(href: string) {
  try { return new URL(href, 'https://en.wikipedia.org').toString(); } catch { return ''; }
}

function extractRows(html: string) {
  const { document } = parseHTML(html);
  return [...document.querySelectorAll('table')]
    .filter(table => /10,000|1,000|100[–-]999/.test(table.textContent || ''))
    .flatMap((table, tableIndex) => [...table.querySelectorAll('tr')].map((row, rowIndex) => {
      const cells = [...row.querySelectorAll('td')];
      const conflictCell = cells[1] || row;
      const links = [...conflictCell.querySelectorAll('a[href]')].map(anchor => {
        let depth = 0;
        let parent = anchor.parentElement;
        while (parent && parent !== conflictCell) {
          if (parent.tagName.toLowerCase() === 'li') depth += 1;
          parent = parent.parentElement;
        }
        const title = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
        const url = absoluteWikipediaUrl(anchor.getAttribute('href') || '');
        return title && url ? { title, url, depth } : null;
      }).filter((link): link is WikipediaConflictLink => link !== null);
      return { tableIndex, rowIndex, text: (row.textContent || '').replace(/\s+/g, ' ').trim(), links };
    }));
}

export async function extractWikipediaConflicts(): Promise<WikipediaConflictsData> {
  const response = await fetch(SOURCE_URL, { next: { revalidate: 21600 } });
  if (!response.ok) throw new Error(`Wikipedia respondeu ${response.status}.`);
  const html = await response.text();
  const rows = extractRows(html);
  const sourceText = rows.map(row => `TABLE ${row.tableIndex + 1} ROW ${row.rowIndex + 1}\n${row.text}\nLINKS:\n${row.links.map(link => `${'  '.repeat(link.depth)}- ${link.title} | ${link.url}`).join('\n')}`).join('\n').slice(0, 120000);
  if (!sourceText.trim()) throw new Error('A página da Wikipedia não retornou as tabelas de conflitos esperadas.');

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Retorne somente JSON válido, sem Markdown, no formato {"conflicts":[{"name":"...","severity":"HIGH","fatalitiesRaw":"...","locations":[]}]}. Extraia todos os conflitos armados ativos das tabelas. Classifique cada conflito pela categoria TABLE em que aparece: HIGH, MEDIUM ou LOW. Preserve os números da fonte e não invente dados. Não invente links: os links são preservados pelo sistema a partir da seção LINKS.' },
      { role: 'user', content: `Fonte: ${SOURCE_URL}\nConteúdo estruturado extraído (os LINKS são páginas reais da Wikipédia):\n${sourceText}` },
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
  const conflicts = raw.conflicts.map((conflict, index) => {
    const match = rows.find(row => row.links.some(link => normalize(link.title) === normalize(conflict.name)))
      || rows.find(row => row.links.some(link => normalize(link.title).includes(normalize(conflict.name)) || normalize(conflict.name).includes(normalize(link.title))));
    const wikipediaLinks = match?.links;
    return {
      ...conflict,
      id: conflict.id || `${conflict.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${index}`,
      severity: conflict.severity || 'UNKNOWN',
      fatalitiesRaw: conflict.fatalitiesRaw || 'Não informado pela fonte',
      locations: conflict.locations || [],
      detailsLink: wikipediaLinks?.[0]?.url || conflict.detailsLink,
      wikipediaLinks,
    };
  });
  if (conflicts.length === 0) throw new Error('A IA não conseguiu extrair conflitos das tabelas atuais da Wikipedia.');
  return { conflicts, sourcePage: SOURCE_URL, lastUpdated: new Date().toISOString() } as WikipediaConflictsData;
}
