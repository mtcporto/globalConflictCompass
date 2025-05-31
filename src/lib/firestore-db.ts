
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { SummarizeConflictNewsOutput } from '@/ai/flows/summarize-conflict-news';
import type { CachedAiSummary } from '@/lib/types';

const SUMMARIES_COLLECTION = 'aiSummaries';

export async function addAiSummaryToFirestore(summary: SummarizeConflictNewsOutput): Promise<void> {
  try {
    await addDoc(collection(db, SUMMARIES_COLLECTION), {
      summary_data: JSON.stringify(summary),
      generated_at: serverTimestamp(), // Usa o timestamp do servidor do Firestore
    });
    console.log('AI Summary added to Firestore.');
  } catch (error) {
    console.error('Failed to add AI summary to Firestore:', error);
    throw error; // Re-throw para ser tratado pelo chamador
  }
}

export async function getLatestAiSummaryFromFirestore(): Promise<CachedAiSummary | null> {
  try {
    const q = query(
      collection(db, SUMMARIES_COLLECTION),
      orderBy('generated_at', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const summary = JSON.parse(data.summary_data) as SummarizeConflictNewsOutput;
      const lastGeneratedTimestamp = data.generated_at as Timestamp; // Firestore Timestamp

      if (!lastGeneratedTimestamp) {
        // Caso de fallback se o timestamp não estiver presente por algum motivo (improvável com serverTimestamp)
        console.warn('Firestore document for AI summary is missing generated_at timestamp.');
        return {
          summary,
          lastGenerated: new Date(0).toISOString(), // Data muito antiga
        };
      }
      
      const lastGenerated = lastGeneratedTimestamp.toDate().toISOString();
      console.log('Latest AI Summary fetched from Firestore, generated at:', lastGenerated);
      return {
        summary,
        lastGenerated,
      };
    }
    console.log('No AI Summary found in Firestore.');
    return null;
  } catch (error) {
    console.error('Failed to get latest AI summary from Firestore:', error);
    // Não relance o erro aqui para permitir que a lógica de fallback gere um novo resumo
    return null;
  }
}
