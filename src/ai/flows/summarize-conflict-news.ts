
// Summarize conflict news from various sources.
//
// - summarizeConflictNews - A function that summarizes conflict news.
// - SummarizeConflictNewsInput - The input type for the summarizeConflictNews function.
// - SummarizeConflictNewsOutput - The return type for the summarizeConflictNews function.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeConflictNewsInputSchema = z.object({
  newsItems: z.array(
    z.object({
      title: z.string().describe('The title of the news item.'),
      description: z.string().describe('A brief description of the news item.'),
      link: z.string().optional().describe('The URL of the news item.'),
    })
  ).describe('An array of news items to summarize.'),
});

export type SummarizeConflictNewsInput = z.infer<typeof SummarizeConflictNewsInputSchema>;

const SummarizeConflictNewsOutputSchema = z.object({
  principaisZonasDeConflito: z.array(z.string()).describe('Lista das principais zonas de conflito mencionadas nas notícias.'),
  eventosChave: z.array(z.string()).describe('Lista dos eventos chave ou desenvolvimentos mais significativos nas notícias.'),
  atoresEnvolvidos: z.array(z.string()).optional().describe('Principais atores (países, grupos formações políticas, etc.) explicitamente mencionados como envolvidos nos conflitos.'),
  impactoHumanitario: z.string().optional().describe('Breve descrição do impacto humanitário mencionado (e.g., deslocados, vítimas, necessidade de ajuda), se houver.'),
  causasFatoresMencionados: z.string().optional().describe('Breve descrição das causas ou fatores que contribuem para os conflitos, conforme explicitamente mencionado nas notícias. Não especule.'),
  resumoGeral: z.string().describe('Um resumo geral conciso dos eventos e da situação, em português brasileiro.'),
});

export type SummarizeConflictNewsOutput = z.infer<typeof SummarizeConflictNewsOutputSchema>;

export async function summarizeConflictNews(input: SummarizeConflictNewsInput): Promise<SummarizeConflictNewsOutput> {
  return summarizeConflictNewsFlow(input);
}

const summarizeConflictNewsPrompt = ai.definePrompt({
  name: 'summarizeConflictNewsPrompt',
  input: {schema: SummarizeConflictNewsInputSchema},
  output: {schema: SummarizeConflictNewsOutputSchema},
  prompt: `Você é um analista de inteligência especializado em conflitos globais. Sua tarefa é analisar os seguintes itens de notícia e fornecer um resumo estruturado em português brasileiro (pt-BR). Concentre-se em extrair informações factuais apresentadas nos textos.

Itens de Notícia:
{{#each newsItems}}
- Título: {{this.title}}
  Descrição: {{this.description}}
  {{#if this.link}}
  Link: {{this.link}}
  {{/if}}
{{/each}}

Com base APENAS nos itens de notícia fornecidos, preencha os seguintes campos:

1.  **Principais Zonas de Conflito**: Identifique e liste as principais regiões geográficas ou países onde os conflitos estão ocorrendo.
2.  **Eventos Chave**: Liste os eventos ou desenvolvimentos mais importantes e recentes mencionados.
3.  **Atores Envolvidos**: Se claramente mencionado, liste os principais atores (países, grupos armados, organizações internacionais, etc.) envolvidos. Se não houver menção clara, indique "Não mencionado explicitamente".
4.  **Impacto Humanitário**: Descreva brevemente qualquer impacto humanitário (vítimas, deslocados, crises, etc.) que seja explicitamente reportado. Se não houver menção clara, indique "Não mencionado explicitamente".
5.  **Causas/Fatores Mencionados**: Se as notícias mencionarem causas diretas, tensões subjacentes ou fatores que contribuem para os conflitos, resuma-os brevemente. Evite especulações ou inferências não suportadas pelos textos. Se não houver menção clara, indique "Não mencionado explicitamente".
6.  **Resumo Geral**: Forneça um parágrafo de resumo geral que conecte os pontos principais e a situação atual conforme as notícias.

Se alguma informação não estiver presente ou clara nos itens de notícia para um determinado campo opcional (Atores Envolvidos, Impacto Humanitário, Causas/Fatores Mencionados), você pode omitir o campo da resposta ou indicar "Não mencionado explicitamente nas notícias fornecidas".
Mantenha o resultado conciso e focado nos fatos dos artigos.
O resultado DEVE estar em português brasileiro (pt-BR).
`,
});

const summarizeConflictNewsFlow = ai.defineFlow(
  {
    name: 'summarizeConflictNewsFlow',
    inputSchema: SummarizeConflictNewsInputSchema,
    outputSchema: SummarizeConflictNewsOutputSchema,
  },
  async input => {
    const {output} = await summarizeConflictNewsPrompt(input);
    return output!;
  }
);
