/**
 * In-memory document storage with embeddings
 * Replaces Qdrant for local storage with Cohere embeddings
 */

export interface StoredDocument {
  id: string;
  filename: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'qa';
  uploadDate: string;
  chunkIndex?: number;
  parentDocumentId?: string;
  embedding?: number[]; // Cohere embedding vector
}

// In-memory storage
const documentStore = new Map<string, StoredDocument>();

/**
 * Store a document with its embedding
 */
export async function storeDocument(document: StoredDocument): Promise<void> {
  documentStore.set(document.id, document);
  console.log(`Document ${document.id} stored (${document.filename})`);
}

/**
 * Store multiple documents in batch
 */
export async function storeDocumentBatch(documents: StoredDocument[]): Promise<void> {
  for (const doc of documents) {
    documentStore.set(doc.id, doc);
  }
  console.log(`Stored ${documents.length} documents`);
}

/**
 * Get a document by ID
 */
export function getDocument(id: string): StoredDocument | undefined {
  return documentStore.get(id);
}

/**
 * Get all documents
 */
export function getAllDocuments(): StoredDocument[] {
  return Array.from(documentStore.values());
}

/**
 * Delete a document by ID
 */
export function deleteDocument(id: string): boolean {
  return documentStore.delete(id);
}

/**
 * Delete documents by parent document ID
 */
export function deleteDocumentsByParentId(parentId: string): number {
  const toDelete = Array.from(documentStore.entries())
    .filter(([_, doc]) => doc.parentDocumentId === parentId || doc.id === parentId)
    .map(([id]) => id);

  toDelete.forEach(id => documentStore.delete(id));
  return toDelete.length;
}

/**
 * Get documents by parent document ID
 */
export function getDocumentsByParentId(parentId: string): StoredDocument[] {
  return Array.from(documentStore.values())
    .filter(doc => doc.parentDocumentId === parentId);
}

/**
 * Clear all documents (for testing)
 */
export function clearAllDocuments(): void {
  documentStore.clear();
  console.log('All documents cleared from store');
}

/**
 * Get document count
 */
export function getDocumentCount(): number {
  return documentStore.size;
}

/**
 * Search documents by embedding similarity using cosine similarity
 */
export function searchByEmbedding(
  queryEmbedding: number[],
  limit: number = 5
): Array<StoredDocument & { score: number }> {
  const results: Array<StoredDocument & { score: number }> = [];

  for (const doc of documentStore.values()) {
    if (!doc.embedding) {
      continue; // Skip documents without embeddings
    }

    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    results.push({ ...doc, score });
  }

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
    console.warn(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
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