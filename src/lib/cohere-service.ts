import axios from 'axios';

const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_API_URL = 'https://api.cohere.ai/v1';

if (!COHERE_API_KEY) {
  console.warn('COHERE_API_KEY not found in environment variables');
}

export interface CohereEmbeddingResponse {
  embeddings: number[][];
  meta?: {
    api_version?: {
      version: string;
    };
  };
}

export interface CohereRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
  meta?: {
    api_version?: {
      version: string;
    };
  };
}

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
 * Generate embeddings using Cohere's embed-english-v3.0 model
 * This model is optimized for semantic search and supports 1024 dimensions
 */
export async function generateCohereEmbedding(text: string): Promise<number[]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  try {
    const response = await axios.post<CohereEmbeddingResponse>(
      `${COHERE_API_URL}/embed`,
      {
        texts: [text],
        model: 'embed-english-v3.0',
        input_type: 'search_document', // For indexing documents
      },
      {
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.embeddings[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Cohere API error:', error.response?.data || error.message);
      throw new Error(`Cohere embedding failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in a single batch request
 */
export async function generateCohereEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  try {
    const response = await axios.post<CohereEmbeddingResponse>(
      `${COHERE_API_URL}/embed`,
      {
        texts,
        model: 'embed-english-v3.0',
        input_type: 'search_document',
      },
      {
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.embeddings;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Cohere API error:', error.response?.data || error.message);
      throw new Error(`Cohere batch embedding failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Generate query embedding (uses different input_type for better search results)
 */
export async function generateCohereQueryEmbedding(query: string): Promise<number[]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  try {
    const response = await axios.post<CohereEmbeddingResponse>(
      `${COHERE_API_URL}/embed`,
      {
        texts: [query],
        model: 'embed-english-v3.0',
        input_type: 'search_query', // For search queries
      },
      {
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.embeddings[0];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Cohere API error:', error.response?.data || error.message);
      throw new Error(`Cohere query embedding failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Rerank documents using Cohere's rerank API
 * This is the key feature for semantic search - it understands context and relevance
 * beyond just keyword matching
 */
export async function rerankDocuments(
  query: string,
  documents: DocumentForRerank[],
  topN: number = 5
): Promise<Array<DocumentForRerank & { relevance_score: number }>> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY is not configured');
  }

  if (documents.length === 0) {
    return [];
  }

  try {
    const response = await axios.post<CohereRerankResponse>(
      `${COHERE_API_URL}/rerank`,
      {
        query,
        documents: documents.map(doc => doc.content),
        model: 'rerank-english-v3.0',
        top_n: topN,
      },
      {
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Map the reranked results back to our documents with scores
    const rerankedDocs = response.data.results.map(result => ({
      ...documents[result.index],
      relevance_score: result.relevance_score,
    }));

    return rerankedDocs;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Cohere rerank API error:', error.response?.data || error.message);
      throw new Error(`Cohere rerank failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Used for embedding-based search
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}