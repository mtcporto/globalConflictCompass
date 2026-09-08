
// Summarize conflict news from various sources.
//
// - summarizeConflictNews - A function that summarizes conflict news.
// - SummarizeConflictNewsInput - The input type for the summarizeConflictNews function.
// - SummarizeConflictNewsOutput - The return type for the summarizeConflictNews function.

'use server';

import OpenAI from 'openai';
import {z} from 'zod';

const SummarizeConflictNewsInputSchema = z.object({
  newsItems: z.array(
    z.object({
      title: z.string().describe('The title of the news item.'),
      description: z.string().describe('A brief description of the news item.'),
      link: z.string().optional().describe('The URL of the news item.'),
      source: z.string().describe('The publication or organization that provided the item.'),
      publishedAt: z.string().optional().describe('Publication date when available.'),
    })
  ).describe('An array of news items to summarize.'),
});

export type SummarizeConflictNewsInput = z.infer<typeof SummarizeConflictNewsInputSchema>;

const SummarizeConflictNewsOutputSchema = z.object({
  panorama: z.string().optional().describe('A clear, contextual overview explaining what is happening and why it matters.'),
  eventosChave: z.array(z.string()).optional().describe("Lista dos eventos chave ou desenvolvimentos mais significativos nas notícias. Se nenhum evento chave for identificado, retornar um array vazio [] ou omitir este campo."),
  conflitosEmDestaque: z.array(z.string()).optional().describe('Conflitos ou crises mais presentes nas notícias, with the country or region when explicit.'),
  atoresEnvolvidos: z.array(z.string()).optional().describe("Principais atores (países, grupos formações políticas, etc.) explicitamente mencionados como envolvidos nos conflitos. Se nenhum ator for identificado, retornar um array vazio [] ou omitir este campo."),
  impactoHumanitario: z.string().optional().describe('Breve descrição do impacto humanitário mencionado (e.g., deslocados, vítimas, necessidade de ajuda), se houver. Se não houver, pode omitir o campo ou retornar "Não mencionado explicitamente nas notícias fornecidas".'),
  causasFatoresMencionados: z.string().optional().describe('Breve descrição das causas ou fatores que contribuem para os conflitos, conforme explicitamente mencionado nas notícias. Não especule. Se não houver, pode omitir o campo ou retornar "Não mencionado explicitamente nas notícias fornecidas".'),
  oQueAcompanhar: z.array(z.string()).optional().describe('Developments readers should watch next, only when directly supported by the reports.'),
  fontes: z.array(z.object({ source: z.string(), title: z.string(), link: z.string().optional() })).optional().describe('The sources used, preserving only links provided in the input.'),
  resumoGeral: z.string().describe('Um resumo geral conciso dos eventos e da situação, em português brasileiro, conectando os pontos principais.'),
});

export type SummarizeConflictNewsOutput = z.infer<typeof SummarizeConflictNewsOutputSchema>;

export async function summarizeConflictNews(input: SummarizeConflictNewsInput): Promise<SummarizeConflictNewsOutput> {
  return summarizeConflictNewsFlow(input);
}

const systemPrompt = `Você é um analista de conflitos globais escrevendo para uma pessoa que não acompanhou as notícias. Responda em português brasileiro, com clareza e contexto, usando somente os fatos presentes nas notícias fornecidas. Não invente números, causas, atores ou acontecimentos. Diferencie fato reportado de incerteza. Ao conectar notícias, explique a conexão sem afirmar mais do que as fontes permitem.

Com base apenas nas notícias fornecidas:

1.  **Eventos Chave** (campo: \`eventosChave\`): Liste os eventos ou desenvolvimentos mais importantes e recentes mencionados.
    - Se houver dados, retorne um array de strings (ex: \`["Evento 1", "Evento 2"]\`).
    - Se NÃO houver dados, você DEVE omitir completamente o campo \`eventosChave\` da resposta JSON OU retornar um array vazio \`[]\`.
    - IMPORTANTE: NÃO retorne \`null\` para este campo. NÃO inclua strings como "Nenhum", "Não há", ou "Não mencionado" como o valor do campo ou dentro do array.

2.  **Atores Envolvidos** (campo: \`atoresEnvolvidos\`): Se claramente mencionado, liste os principais atores (países, grupos armados, organizações internacionais, etc.) envolvidos.
    - Se houver dados, retorne um array de strings.
    - Se NÃO houver dados, você DEVE omitir completamente o campo \`atoresEnvolvidos\` da resposta JSON OU retornar um array vazio \`[]\`.
    - IMPORTANTE: NÃO retorne \`null\` para este campo. NÃO inclua strings como "Nenhum", "Não há", ou "Não mencionado" como o valor do campo ou dentro do array.

3.  **Impacto Humanitário** (campo: \`impactoHumanitario\`): Descreva brevemente qualquer impacto humanitário (vítimas, deslocados, crises, etc.) que seja explicitamente reportado.
    - Se não houver menção clara, você DEVE omitir o campo \`impactoHumanitario\` OU fornecer a string "Não mencionado explicitamente nas notícias fornecidas".
    - IMPORTANTE: NÃO retorne \`null\` para este campo.

4.  **Causas/Fatores Mencionados** (campo: \`causasFatoresMencionados\`): Se as notícias mencionarem causas diretas, tensões subjacentes ou fatores que contribuem para os conflitos, resuma-os brevemente. Evite especulações ou inferências não suportadas pelos textos.
    - Se não houver menção clara, você DEVE omitir o campo \`causasFatoresMencionados\` OU fornecer a string "Não mencionado explicitamente nas notícias fornecidas".
    - IMPORTANTE: NÃO retorne \`null\` para este campo.

5.  **Resumo Geral** (campo: \`resumoGeral\`): Forneça um parágrafo de resumo geral que conecte os pontos principais e a situação atual conforme as notícias. Este campo é OBRIGATÓRIO e deve ser um resumo mais detalhado dos eventos.

6. **Panorama** (campo: \`panorama\`): Escreva 2 ou 3 parágrafos explicando o que está acontecendo, onde, quem é afetado e qual é a dimensão dos desenvolvimentos. Evite frases genéricas.

7. **Conflitos em destaque** (campo: \`conflitosEmDestaque\`): Liste os conflitos ou crises claramente identificáveis nas notícias, com país ou região quando estiver explícito.

8. **O que acompanhar** (campo: \`oQueAcompanhar\`): Liste até 4 desenvolvimentos futuros que as próprias notícias indiquem como relevantes. Não faça previsões.

9. **Fontes** (campo: \`fontes\`): Liste as notícias realmente usadas, mantendo exatamente os links recebidos. Nunca crie ou altere URLs.

Instruções CRÍTICAS para o formato da resposta:
- O resultado DEVE estar em português brasileiro (pt-BR).
- É ABSOLUTAMENTE CRUCIAL que a sua resposta respeite o schema de output JSON fornecido.
- Para campos de array opcionais (\`eventosChave\`, \`atoresEnvolvidos\`): se não houver dados, siga as instruções detalhadas acima (omitir o campo ou retornar \`[]\`).
- Para campos de string opcionais (\`impactoHumanitario\`, \`causasFatoresMencionados\`): se nenhuma informação for encontrada, siga as instruções detalhadas acima (omitir o campo ou retornar a string padrão, quando aplicável).
- O campo \`resumoGeral\` é obrigatório e deve sempre ser uma string.

Mantenha o resultado informativo, específico e focado nos fatos. Um resumo curto demais que apenas repete manchetes não atende ao pedido.`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'not-needed',
  ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
});

function parseJsonResponse(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('O GPT retornou conteúdo que não é JSON válido.');
  }
}

async function summarizeConflictNewsFlow(input: SummarizeConflictNewsInput): Promise<SummarizeConflictNewsOutput> {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(input.newsItems) },
    ],
    response_format: { type: 'json_object' },
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) throw new Error(`O GPT recusou o resumo: ${message.refusal}`);
  if (!message?.content) throw new Error('O GPT não retornou um resumo estruturado.');
  return SummarizeConflictNewsOutputSchema.parse(parseJsonResponse(message.content));
}
