'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const InputSchema = z.object({ pages: z.array(z.object({ title: z.string(), extract: z.string(), link: z.string() })) });
const OutputSchema = z.object({ pages: z.array(z.object({ title: z.string(), translatedExtract: z.string(), link: z.string() })) });
export type TranslateWikipediaContextInput = z.infer<typeof InputSchema>;
export type TranslateWikipediaContextOutput = z.infer<typeof OutputSchema>;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'not-needed',
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});

function parseJson(content: string) {
  const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('O GPT não retornou uma tradução estruturada.');
  const value = clean.slice(start, end + 1);
  let sanitized = '';
  let insideString = false;
  let escaped = false;
  for (const character of value) {
    if (insideString) {
      if (escaped) {
        sanitized += character;
        escaped = false;
      } else if (character === '\\') {
        sanitized += character;
        escaped = true;
      } else if (character === '"') {
        sanitized += character;
        insideString = false;
      } else if (character === '\n') sanitized += '\\n';
      else if (character === '\r') sanitized += '\\r';
      else if (character === '\t') sanitized += '\\t';
      else if (character.charCodeAt(0) < 0x20) sanitized += ' ';
      else sanitized += character;
    } else {
      sanitized += character;
      if (character === '"') insideString = true;
    }
  }
  return OutputSchema.parse(JSON.parse(sanitized));
}

export async function translateWikipediaContext(input: TranslateWikipediaContextInput): Promise<TranslateWikipediaContextOutput> {
  const validated = InputSchema.parse(input);
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: 'Traduza os resumos da Wikipédia para português brasileiro claro e natural. Preserve o sentido e o grau de certeza do texto original. Não adicione fatos, datas, atores ou explicações que não estejam no texto. Retorne somente JSON válido no formato {"pages":[{"title":"...","translatedExtract":"...","link":"..."}]}. Preserve exatamente title e link.' },
      { role: 'user', content: JSON.stringify(validated.pages) },
    ],
    response_format: { type: 'json_object' },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('O GPT não retornou a tradução.');
  return parseJson(content);
}
