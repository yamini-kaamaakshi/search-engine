import { generateGeminiQueryEmbedding, cosineSimilarity } from './gemini-service';
import { rerankWithCohere, type DocumentForRerank } from './cohere-service';
import { getAllDocuments } from './document-store';

interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  type: 'qa' | 'file';
  source?: string;
  filename?: string;
  chunkIndex?: number;
}

/**
 * 2-STAGE SEMANTIC SEARCH
 *
 * Stage 1: Gemini Embeddings (Fast, Broad)
 * - Convert query to embedding vector
 * - Compare with all document embeddings using cosine similarity
 * - Get top 20-30 candidates (fast vector search)
 *
 * Stage 2: Cohere Rerank (Accurate, Deep)
 * - Use Cohere rerank-v3.5 to deeply analyze the candidates
 * - Understands semantic meaning and context
 * - Returns top N with accurate relevance scores
 *
 * Example: Query "mobile developer" finds CVs with "iOS", "Android", "Swift", "Kotlin"
 * even though they don't explicitly say "mobile developer"
 */
export async function searchDocumentsWithGemini(query: string, limit: number = 5) {
  try {
    // Get all documents from storage
    const allDocs = await getAllDocuments();

    if (allDocs.length === 0) {
      console.log('No documents found in storage');
      return [];
    }

    console.log(`[Stage 1] Starting 2-stage search for "${query}" across ${allDocs.length} chunks`);

    // STAGE 1: Gemini Embeddings - Get top candidates using cosine similarity
    console.log('[Stage 1] Generating query embedding with Gemini...');
    const queryEmbedding = await generateGeminiQueryEmbedding(query);

    // Calculate cosine similarity for all documents
    const candidates = allDocs
      .filter(doc => doc.embedding) // Only documents with embeddings
      .map(doc => ({
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score) // Sort by similarity
      .slice(0, Math.min(30, allDocs.length)); // Get top 30 candidates

    console.log(`[Stage 1] Found ${candidates.length} candidates (top score: ${candidates[0]?.score.toFixed(3) || 'N/A'})`);

    if (candidates.length === 0) {
      console.log('No candidates found in Stage 1');
      return [];
    }

    // Convert to DocumentForRerank format
    const docsForRerank: DocumentForRerank[] = candidates.map(({ doc }) => ({
      id: doc.id,
      content: doc.content,
      filename: doc.filename,
      type: doc.type,
      uploadDate: doc.uploadDate,
      chunkIndex: doc.chunkIndex,
      parentDocumentId: doc.parentDocumentId,
    }));

    // STAGE 2: Cohere Rerank - Deep semantic analysis
    console.log(`[Stage 2] Reranking ${docsForRerank.length} candidates with Cohere rerank-v3.5...`);
    const rerankedDocs = await rerankWithCohere(query, docsForRerank, limit);

    console.log(`[Stage 2] Reranking complete. Top ${rerankedDocs.length} results returned`);
    console.log('Final scores:', rerankedDocs.map(d => ({
      file: d.filename,
      score: d.relevance_score.toFixed(3)
    })));

    // Convert to search result format
    const results = rerankedDocs.map(doc => ({
      id: doc.id,
      title: doc.filename || 'Untitled',
      content: doc.content || '',
      type: 'file' as const,
      source: doc.filename || '',
      filename: doc.filename || '',
      chunkIndex: doc.chunkIndex,
      score: doc.relevance_score,
    }));

    return results;
  } catch (error) {
    console.error('Error in 2-stage search:', error);
    throw error;
  }
}

/**
 * Generate an answer using Gemini's generative capabilities
 */
export async function generateAnswerWithGemini(query: string, relevantDocs: any[]): Promise<string> {
  if (!relevantDocs || relevantDocs.length === 0) {
    return "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.";
  }

  // Create a summary of the top results
  const summaries = relevantDocs.slice(0, 5).map((doc, index) => {
    return `${index + 1}. ${doc.filename}\n   ${doc.content.substring(0, 200)}${doc.content.length > 200 ? '...' : ''}`;
  });

  return `Found ${relevantDocs.length} relevant document${relevantDocs.length > 1 ? 's' : ''} for your query "${query}":\n\n${summaries.join('\n\n')}`;
}