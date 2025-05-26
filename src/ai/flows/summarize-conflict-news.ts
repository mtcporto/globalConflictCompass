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
  summary: z.string().describe('A summary of the conflict news.'),
});

export type SummarizeConflictNewsOutput = z.infer<typeof SummarizeConflictNewsOutputSchema>;

export async function summarizeConflictNews(input: SummarizeConflictNewsInput): Promise<SummarizeConflictNewsOutput> {
  return summarizeConflictNewsFlow(input);
}

const summarizeConflictNewsPrompt = ai.definePrompt({
  name: 'summarizeConflictNewsPrompt',
  input: {schema: SummarizeConflictNewsInputSchema},
  output: {schema: SummarizeConflictNewsOutputSchema},
  prompt: `You are an AI assistant that summarizes conflict news from various sources.

  Summarize the following news items into a single, concise summary. Include the most important details and events.  If a news item has a URL, consider whether the URL would be useful to the user. If so, include it in the summary.

  News Items:
  {{#each newsItems}}
  - Title: {{this.title}}
    Description: {{this.description}}
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
