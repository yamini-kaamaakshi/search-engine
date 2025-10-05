/**
 * Document storage with Qdrant vector database
 * Uses Qdrant for persistent storage with Cohere embeddings
 */

import { qdrantClient, COLLECTION_NAME, initializeCollection } from './qdrant-client';
import { v4 as uuidv4 } from 'uuid';

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

// Initialize collection on module load
let collectionInitialized = false;
const initPromise = initializeCollection()
  .then(() => {
    collectionInitialized = true;
    console.log('Qdrant collection initialized');
  })
  .catch((error) => {
    console.error('Failed to initialize Qdrant collection:', error);
  });

/**
 * Ensure collection is initialized before operations
 */
async function ensureInitialized(): Promise<void> {
  if (!collectionInitialized) {
    await initPromise;
  }
}

/**
 * Store a document with its embedding in Qdrant
 */
export async function storeDocument(document: StoredDocument): Promise<void> {
  await ensureInitialized();

  if (!document.embedding) {
    throw new Error('Document must have an embedding to be stored');
  }

  try {
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: document.id,
          vector: document.embedding,
          payload: {
            filename: document.filename,
            content: document.content,
            type: document.type,
            uploadDate: document.uploadDate,
            chunkIndex: document.chunkIndex,
            parentDocumentId: document.parentDocumentId,
          },
        },
      ],
    });

    console.log(`Document ${document.id} stored in Qdrant (${document.filename})`);
  } catch (error) {
    console.error('Error storing document in Qdrant:', error);
    throw new Error(`Failed to store document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store multiple documents in batch
 */
export async function storeDocumentBatch(documents: StoredDocument[]): Promise<void> {
  await ensureInitialized();

  try {
    const points = documents.map((doc) => {
      if (!doc.embedding) {
        throw new Error(`Document ${doc.id} must have an embedding`);
      }

      return {
        id: doc.id,
        vector: doc.embedding,
        payload: {
          filename: doc.filename,
          content: doc.content,
          type: doc.type,
          uploadDate: doc.uploadDate,
          chunkIndex: doc.chunkIndex,
          parentDocumentId: doc.parentDocumentId,
        },
      };
    });

    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    console.log(`Stored ${documents.length} documents in Qdrant`);
  } catch (error) {
    console.error('Error storing document batch in Qdrant:', error);
    throw new Error(`Failed to store documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a document by ID from Qdrant
 */
export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  await ensureInitialized();

  try {
    const result = await qdrantClient.retrieve(COLLECTION_NAME, {
      ids: [id],
      with_payload: true,
      with_vector: true,
    });

    if (result.length === 0) {
      return undefined;
    }

    const point = result[0];
    return {
      id: point.id as string,
      filename: point.payload?.filename as string,
      content: point.payload?.content as string,
      type: point.payload?.type as 'pdf' | 'docx' | 'txt' | 'qa',
      uploadDate: point.payload?.uploadDate as string,
      chunkIndex: point.payload?.chunkIndex as number | undefined,
      parentDocumentId: point.payload?.parentDocumentId as string | undefined,
      embedding: Array.isArray(point.vector) ? point.vector : undefined,
    };
  } catch (error) {
    console.error('Error retrieving document from Qdrant:', error);
    return undefined;
  }
}

/**
 * Get all documents from Qdrant
 */
export async function getAllDocuments(): Promise<StoredDocument[]> {
  await ensureInitialized();

  try {
    // Scroll through all points in the collection
    const result = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 10000,
      with_payload: true,
      with_vector: false,
    });

    return result.points.map((point) => ({
      id: point.id as string,
      filename: point.payload?.filename as string,
      content: point.payload?.content as string,
      type: point.payload?.type as 'pdf' | 'docx' | 'txt' | 'qa',
      uploadDate: point.payload?.uploadDate as string,
      chunkIndex: point.payload?.chunkIndex as number | undefined,
      parentDocumentId: point.payload?.parentDocumentId as string | undefined,
    }));
  } catch (error) {
    console.error('Error getting all documents from Qdrant:', error);
    return [];
  }
}

/**
 * Delete a document by ID from Qdrant
 */
export async function deleteDocument(id: string): Promise<boolean> {
  await ensureInitialized();

  try {
    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      points: [id],
    });

    console.log(`Document ${id} deleted from Qdrant`);
    return true;
  } catch (error) {
    console.error('Error deleting document from Qdrant:', error);
    return false;
  }
}

/**
 * Delete documents by parent document ID
 */
export async function deleteDocumentsByParentId(parentId: string): Promise<number> {
  await ensureInitialized();

  try {
    // First, get all documents with this parent ID
    const allDocs = await getAllDocuments();
    const toDelete = allDocs
      .filter((doc) => doc.parentDocumentId === parentId || doc.id === parentId)
      .map((doc) => doc.id);

    if (toDelete.length === 0) {
      return 0;
    }

    // Delete all matching documents
    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      points: toDelete,
    });

    console.log(`Deleted ${toDelete.length} documents with parent ID ${parentId}`);
    return toDelete.length;
  } catch (error) {
    console.error('Error deleting documents by parent ID from Qdrant:', error);
    return 0;
  }
}

/**
 * Get documents by parent document ID
 */
export async function getDocumentsByParentId(parentId: string): Promise<StoredDocument[]> {
  await ensureInitialized();

  try {
    const allDocs = await getAllDocuments();
    return allDocs.filter((doc) => doc.parentDocumentId === parentId);
  } catch (error) {
    console.error('Error getting documents by parent ID from Qdrant:', error);
    return [];
  }
}

/**
 * Clear all documents from Qdrant (for testing)
 */
export async function clearAllDocuments(): Promise<void> {
  await ensureInitialized();

  try {
    // Delete and recreate the collection
    await qdrantClient.deleteCollection(COLLECTION_NAME);
    await initializeCollection();
    console.log('All documents cleared from Qdrant');
  } catch (error) {
    console.error('Error clearing documents from Qdrant:', error);
    throw new Error(`Failed to clear documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get document count from Qdrant
 */
export async function getDocumentCount(): Promise<number> {
  await ensureInitialized();

  try {
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
    return collectionInfo.points_count || 0;
  } catch (error) {
    console.error('Error getting document count from Qdrant:', error);
    return 0;
  }
}

/**
 * Search documents by embedding similarity using Qdrant's vector search
 */
export async function searchByEmbedding(
  queryEmbedding: number[],
  limit: number = 5
): Promise<Array<StoredDocument & { score: number }>> {
  await ensureInitialized();

  try {
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
      with_vector: false,
    });

    return searchResult.map((point) => ({
      id: point.id as string,
      filename: point.payload?.filename as string,
      content: point.payload?.content as string,
      type: point.payload?.type as 'pdf' | 'docx' | 'txt' | 'qa',
      uploadDate: point.payload?.uploadDate as string,
      chunkIndex: point.payload?.chunkIndex as number | undefined,
      parentDocumentId: point.payload?.parentDocumentId as string | undefined,
      score: point.score,
    }));
  } catch (error) {
    console.error('Error searching documents in Qdrant:', error);
    return [];
  }
}