import { getUploadedDocuments, splitDocumentIntoChunks } from './file-processor';
import { rerankDocuments, type DocumentForRerank } from './cohere-service';
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
 * Search documents using Cohere's rerank API
 * This provides semantic search that understands context and intent
 * rather than just keyword matching
 */
export async function searchDocuments(query: string, limit: number = 5) {
  try {
    // Get all documents from storage
    const allDocs = await getAllDocuments();

    if (allDocs.length === 0) {
      console.log('No documents found in storage');
      return [];
    }

    console.log(`Searching ${allDocs.length} document chunks for: "${query}"`);

    // Convert stored documents to rerank format
    const docsForRerank: DocumentForRerank[] = allDocs.map(doc => ({
      id: doc.id,
      content: doc.content,
      filename: doc.filename,
      type: doc.type,
      uploadDate: doc.uploadDate,
      chunkIndex: doc.chunkIndex,
      parentDocumentId: doc.parentDocumentId,
    }));

    // Use Cohere rerank API to find most relevant documents
    // This is where the magic happens - Cohere understands semantic meaning
    // For example: "mobile developer" will match "iOS Engineer" or "Android Developer"
    const rerankedDocs = await rerankDocuments(query, docsForRerank, limit);

    // Filter out results with very low relevance (below 2%)
    // This removes documents that have no meaningful relevance to the query
    const RELEVANCE_THRESHOLD = 0.02; // 2% minimum relevance
    const filteredDocs = rerankedDocs.filter(doc => doc.relevance_score >= RELEVANCE_THRESHOLD);

    console.log(`Found ${filteredDocs.length} relevant documents (filtered from ${rerankedDocs.length} total)`);

    // Convert to search result format
    const results = filteredDocs.map(doc => ({
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
    console.error('Error in Cohere search:', error);
    throw error;
  }
}

/**
 * Generate an answer using search results
 * For now, this is a simple summary generator
 * In a production system, you could use Cohere's generate API here too
 */
export async function generateAnswer(query: string, relevantDocs: any[]): Promise<string> {
  if (!relevantDocs || relevantDocs.length === 0) {
    return "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.";
  }

  // Create a summary of the top results
  const summaries = relevantDocs.slice(0, 5).map((doc, index) => {
    const scorePercent = Math.round((doc.score || 0) * 100);
    return `${index + 1}. ${doc.filename} (${scorePercent}% relevant)\n   ${doc.content.substring(0, 200)}${doc.content.length > 200 ? '...' : ''}`;
  });

  return `Found ${relevantDocs.length} relevant document${relevantDocs.length > 1 ? 's' : ''} for your query "${query}":\n\n${summaries.join('\n\n')}`;
}