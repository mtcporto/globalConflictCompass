
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-conflict-news.ts';
import '@/ai/flows/extract-wikipedia-conflicts-flow.ts'; // Added new flow
