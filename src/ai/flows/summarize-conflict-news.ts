
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
  eventosChave: z.array(z.string()).optional().describe("Lista dos eventos chave ou desenvolvimentos mais significativos nas notícias. Se nenhum evento chave for identificado, retornar um array vazio [] ou omitir este campo."),
  atoresEnvolvidos: z.array(z.string()).optional().describe("Principais atores (países, grupos formações políticas, etc.) explicitamente mencionados como envolvidos nos conflitos. Se nenhum ator for identificado, retornar um array vazio [] ou omitir este campo."),
  impactoHumanitario: z.string().optional().describe('Breve descrição do impacto humanitário mencionado (e.g., deslocados, vítimas, necessidade de ajuda), se houver. Se não houver, pode omitir o campo ou retornar "Não mencionado explicitamente nas notícias fornecidas".'),
  causasFatoresMencionados: z.string().optional().describe('Breve descrição das causas ou fatores que contribuem para os conflitos, conforme explicitamente mencionado nas notícias. Não especule. Se não houver, pode omitir o campo ou retornar "Não mencionado explicitamente nas notícias fornecidas".'),
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

1.  **Eventos Chave** (campo: \`eventosChave\`): Liste os eventos ou desenvolvimentos mais importantes e recentes mencionados.
    - Se houver dados, retorne um array de strings (ex: \`["Evento 1", "Evento 2"]\`).
    - Se NÃO houver dados, a forma PREFERENCIAL é retornar um array vazio (\`[]\`).
    - Você também PODE omitir o campo completamente da resposta JSON.
    - NUNCA retorne strings como "Nenhum", "Não há", "Não mencionado" como o valor direto deste campo, nem como um item dentro de um array (ex: \`["Nenhum"]\`). NUNCA retorne \`null\` para este campo.

2.  **Atores Envolvidos** (campo: \`atoresEnvolvidos\`): Se claramente mencionado, liste os principais atores (países, grupos armados, organizações internacionais, etc.) envolvidos.
    - Se houver dados, retorne um array de strings.
    - Se NÃO houver dados, a forma PREFERENCIAL é retornar um array vazio (\`[]\`).
    - Você também PODE omitir o campo completamente da resposta JSON.
    - NUNCA retorne strings como "Nenhum" ou "Não mencionado" como valor direto deste campo ou dentro do array. NUNCA retorne \`null\` para este campo.

3.  **Impacto Humanitário** (campo: \`impactoHumanitario\`): Descreva brevemente qualquer impacto humanitário (vítimas, deslocados, crises, etc.) que seja explicitamente reportado. Se não houver menção clara, você pode omitir o campo \`impactoHumanitario\` ou fornecer a string "Não mencionado explicitamente nas notícias fornecidas".

4.  **Causas/Fatores Mencionados** (campo: \`causasFatoresMencionados\`): Se as notícias mencionarem causas diretas, tensões subjacentes ou fatores que contribuem para os conflitos, resuma-os brevemente. Evite especulações ou inferências não suportadas pelos textos. Se não houver menção clara, você pode omitir o campo \`causasFatoresMencionados\` ou fornecer a string "Não mencionado explicitamente nas notícias fornecidas".

5.  **Resumo Geral** (campo: \`resumoGeral\`): Forneça um parágrafo de resumo geral que conecte os pontos principais e a situação atual conforme as notícias. Este campo é obrigatório.

Instruções CRÍTICAS para o formato da resposta:
- O resultado DEVE estar em português brasileiro (pt-BR).
- É ABSOLUTAMENTE CRUCIAL que a sua resposta respeite o schema de output JSON fornecido.
- Para campos de array opcionais como \`eventosChave\` e \`atoresEnvolvidos\`: se não houver dados, siga as instruções detalhadas acima (preferencialmente \`[]\` ou omitir o campo). Não use \`null\` para estes campos.
- Para campos de string opcionais como \`impactoHumanitario\` e \`causasFatoresMencionados\`: se nenhuma informação for encontrada, você PODE retornar a string "Não mencionado explicitamente nas notícias fornecidas" ou omitir o campo.
- O campo \`resumoGeral\` é obrigatório e deve sempre ser uma string.

Mantenha o resultado conciso e focado nos fatos dos artigos.
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const summarizeConflictNewsFlow = ai.defineFlow(
  {
    name: 'summarizeConflictNewsFlow',
    inputSchema: SummarizeConflictNewsInputSchema,
    outputSchema: SummarizeConflictNewsOutputSchema,
  },
  async input => {
    const {output} = await summarizeConflictNewsPrompt(input);
    if (!output) {
      // This case should ideally be caught by Genkit's schema validation if the output is truly non-conformant and an error is thrown.
      // However, if it resolves to undefined/null without throwing, this is a fallback.
      console.error('AI summary flow returned undefined output. Input:', JSON.stringify(input).substring(0, 500));
      throw new Error('O fluxo de resumo de IA retornou uma saída inesperada (undefined/null).');
    }
    return output; // No non-null assertion here, rely on schema validation.
  }
);
