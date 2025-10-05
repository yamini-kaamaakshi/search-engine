/**
 * In-memory document storage
 * Simple storage without external database dependencies
 */

export interface StoredDocument {
  id: string;
  filename: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'qa';
  uploadDate: string;
  chunkIndex?: number;
  parentDocumentId?: string;
  embedding?: number[]; // Gemini embedding vector
}

// In-memory storage
const documentsStore = new Map<string, StoredDocument>();

/**
 * Store a document in memory
 */
export async function storeDocument(document: StoredDocument): Promise<void> {
  documentsStore.set(document.id, document);
  console.log(`Document ${document.id} stored in memory (${document.filename})`);
}

/**
 * Store multiple documents in batch
 */
export async function storeDocumentBatch(documents: StoredDocument[]): Promise<void> {
  documents.forEach(doc => documentsStore.set(doc.id, doc));
  console.log(`Stored ${documents.length} documents in memory`);
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  return documentsStore.get(id);
}

/**
 * Get all documents
 */
export async function getAllDocuments(): Promise<StoredDocument[]> {
  return Array.from(documentsStore.values());
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const deleted = documentsStore.delete(id);
  if (deleted) {
    console.log(`Document ${id} deleted from memory`);
  }
  return deleted;
}

/**
 * Delete documents by parent document ID
 */
export async function deleteDocumentsByParentId(parentId: string): Promise<number> {
  const toDelete: string[] = [];

  documentsStore.forEach((doc, id) => {
    if (doc.parentDocumentId === parentId || doc.id === parentId) {
      toDelete.push(id);
    }
  });

  toDelete.forEach(id => documentsStore.delete(id));

  if (toDelete.length > 0) {
    console.log(`Deleted ${toDelete.length} documents with parent ID ${parentId}`);
  }

  return toDelete.length;
}

/**
 * Get documents by parent document ID
 */
export async function getDocumentsByParentId(parentId: string): Promise<StoredDocument[]> {
  const docs: StoredDocument[] = [];

  documentsStore.forEach(doc => {
    if (doc.parentDocumentId === parentId) {
      docs.push(doc);
    }
  });

  return docs;
}

/**
 * Clear all documents (for testing)
 */
export async function clearAllDocuments(): Promise<void> {
  documentsStore.clear();
  console.log('All documents cleared from memory');
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  return documentsStore.size;
}

/**
 * Search documents by embedding similarity (simple cosine similarity)
 */
export async function searchByEmbedding(
  queryEmbedding: number[],
  limit: number = 5
): Promise<Array<StoredDocument & { score: number }>> {
  const results: Array<StoredDocument & { score: number }> = [];

  documentsStore.forEach(doc => {
    if (doc.embedding) {
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      results.push({ ...doc, score });
    }
  });

  // Sort by score descending and return top N
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
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