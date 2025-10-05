import { CohereClient } from 'cohere-ai';

const COHERE_API_KEY = process.env.COHERE_API_KEY;

if (!COHERE_API_KEY) {
  console.warn('COHERE_API_KEY not found in environment variables');
}

// Initialize Cohere client
const cohere = COHERE_API_KEY ? new CohereClient({ token: COHERE_API_KEY }) : null;

export interface DocumentForRerank {
  id: string;
  content: string;
  filename?: string;
  type?: string;
  uploadDate?: string;
  chunkIndex?: number;
  parentDocumentId?: string;
}

/**
 * Rerank documents using Cohere's rerank-v3.5 model
 * This provides superior semantic understanding compared to embeddings alone
 *
 * @param query - The search query
 * @param documents - List of documents to rerank (typically top 20-30 from embedding search)
 * @param topN - Number of top results to return (default: 5)
 * @returns Reranked documents with relevance scores
 */
export async function rerankWithCohere(
  query: string,
  documents: DocumentForRerank[],
  topN: number = 5
): Promise<Array<DocumentForRerank & { relevance_score: number }>> {
  if (!COHERE_API_KEY || !cohere) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  if (documents.length === 0) {
    return [];
  }

  try {
    console.log(`Reranking ${documents.length} documents with Cohere rerank-v3.5...`);

    // Cohere rerank expects documents as strings
    const docTexts = documents.map(doc => doc.content);

    // Call Cohere rerank API
    const response = await cohere.v2.rerank({
      model: 'rerank-v3.5',
      query: query,
      documents: docTexts,
      topN: topN,
    });

    // Map Cohere results back to our document format
    const rerankedDocs = response.results.map(result => {
      const originalDoc = documents[result.index];
      return {
        ...originalDoc,
        relevance_score: result.relevanceScore,
      };
    });

    console.log(`Cohere reranking complete. Top score: ${rerankedDocs[0]?.relevance_score.toFixed(3) || 'N/A'}`);

    return rerankedDocs;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Cohere rerank error:', error.message);
      throw new Error(`Cohere rerank failed: ${error.message}`);
    }
    throw new Error('Cohere rerank failed: Unknown error');
  }
}

/**
 * Batch rerank multiple queries (useful for batch processing)
 */
export async function batchRerankWithCohere(
  queries: string[],
  documents: DocumentForRerank[],
  topN: number = 5
): Promise<Map<string, Array<DocumentForRerank & { relevance_score: number }>>> {
  const results = new Map<string, Array<DocumentForRerank & { relevance_score: number }>>();

  for (const query of queries) {
    const reranked = await rerankWithCohere(query, documents, topN);
    results.set(query, reranked);
  }

  return results;
}