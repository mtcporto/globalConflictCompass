
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
  principaisZonasDeConflito: z.array(
    z.object({
      nome: z.string().describe('O nome da zona de conflito.'),
      latitude: z.number().nullable().optional().describe('A latitude aproximada da zona de conflito. Retornar null ou omitir o campo se não souber.'),
      longitude: z.number().nullable().optional().describe('A longitude aproximada da zona de conflito. Retornar null ou omitir o campo se não souber.')
    })
  ).optional().describe("Lista das principais zonas de conflito mencionadas nas notícias. Se nenhuma zona for identificada, retornar um array vazio [] ou omitir este campo."),
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

1.  **Principais Zonas de Conflito** (campo: \`principaisZonasDeConflito\`): Identifique e liste as principais regiões geográficas ou países onde os conflitos estão ocorrendo. Para cada zona, forneça o nome e, se possível e com um grau razoável de confiança, as coordenadas geográficas aproximadas (latitude e longitude). Se as coordenadas não forem conhecidas ou forem muito imprecisas, defina os valores de \`latitude\` e \`longitude\` como nulo (null) ou omita esses campos para essa zona específica. Se nenhuma zona de conflito for identificada nas notícias, você DEVE retornar um array vazio (\`[]\`) para \`principaisZonasDeConflito\` ou omitir completamente o campo \`principaisZonasDeConflito\` da sua resposta. Não inclua strings como "Nenhuma" neste campo.
2.  **Eventos Chave** (campo: \`eventosChave\`): Liste os eventos ou desenvolvimentos mais importantes e recentes mencionados. Se nenhum evento chave for identificado, você DEVE retornar um array vazio (\`[]\`) para \`eventosChave\` ou omitir completamente o campo \`eventosChave\`. Não inclua strings como "Nenhum" neste campo.
3.  **Atores Envolvidos** (campo: \`atoresEnvolvidos\`): Se claramente mencionado, liste os principais atores (países, grupos armados, organizações internacionais, etc.) envolvidos. Se nenhum ator for identificado, você DEVE retornar um array vazio (\`[]\`) para \`atoresEnvolvidos\` ou omitir completamente o campo \`atoresEnvolvidos\`. Não inclua strings como "Não mencionado" neste campo.
4.  **Impacto Humanitário** (campo: \`impactoHumanitario\`): Descreva brevemente qualquer impacto humanitário (vítimas, deslocados, crises, etc.) que seja explicitamente reportado. Se não houver menção clara, você pode omitir o campo \`impactoHumanitario\` ou fornecer a string "Não mencionado explicitamente nas notícias fornecidas".
5.  **Causas/Fatores Mencionados** (campo: \`causasFatoresMencionados\`): Se as notícias mencionarem causas diretas, tensões subjacentes ou fatores que contribuem para os conflitos, resuma-os brevemente. Evite especulações ou inferências não suportadas pelos textos. Se não houver menção clara, você pode omitir o campo \`causasFatoresMencionados\` ou fornecer a string "Não mencionado explicitamente nas notícias fornecidas".
6.  **Resumo Geral** (campo: \`resumoGeral\`): Forneça um parágrafo de resumo geral que conecte os pontos principais e a situação atual conforme as notícias. Este campo é obrigatório.

Instruções CRÍTICAS para o formato da resposta:
- O resultado DEVE estar em português brasileiro (pt-BR).
- É ABSOLUTAMENTE CRUCIAL que a sua resposta respeite o schema de output JSON fornecido.
- Para campos de array opcionais como \`principaisZonasDeConflito\`, \`eventosChave\`, e \`atoresEnvolvidos\`: se não houver dados, SEMPRE retorne um array vazio \`[]\` ou omita o campo completamente. NUNCA retorne strings como "Nenhum", "Não há", "Não mencionado" como valor para esses campos de array, nem dentro deles.
- Para campos numéricos opcionais e anuláveis como \`latitude\` e \`longitude\` dentro de \`principaisZonasDeConflito\`: se desconhecidos, retorne \`null\` ou omita o campo. Não retorne strings.
- Para campos de string opcionais como \`impactoHumanitario\` e \`causasFatoresMencionados\`: se nenhuma informação for encontrada, você PODE retornar a string "Não mencionado explicitamente nas notícias fornecidas" ou omitir o campo.
- O campo \`resumoGeral\` é obrigatório e deve sempre ser uma string.

Mantenha o resultado conciso e focado nos fatos dos artigos.
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

