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
  summary: z.string().describe('A summary of the conflict news in Brazilian Portuguese.'),
});

export type SummarizeConflictNewsOutput = z.infer<typeof SummarizeConflictNewsOutputSchema>;

export async function summarizeConflictNews(input: SummarizeConflictNewsInput): Promise<SummarizeConflictNewsOutput> {
  return summarizeConflictNewsFlow(input);
}

const summarizeConflictNewsPrompt = ai.definePrompt({
  name: 'summarizeConflictNewsPrompt',
  input: {schema: SummarizeConflictNewsInputSchema},
  output: {schema: SummarizeConflictNewsOutputSchema},
  prompt: `Você é um assistente de IA que resume notícias sobre conflitos de várias fontes.

  Resuma os seguintes itens de notícias em um único resumo conciso em português brasileiro (pt-BR). Inclua os detalhes e eventos mais importantes. Se um item de notícia tiver um URL, considere se o URL seria útil para o usuário. Se sim, inclua-o no resumo.

  Itens de Notícia:
  {{#each newsItems}}
  - Título: {{this.title}}
    Descrição: {{this.description}}
    {{#if this.link}}
    Link: {{this.link}}
    {{/if}}
  {{/each}}
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

