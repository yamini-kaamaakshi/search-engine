import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

export const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'documents_collection';

export interface StoredDocument {
  id: string;
  filename: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'qa';
  uploadDate: string;
  chunkIndex?: number;
  parentDocumentId?: string; // For grouping chunks back to documents
}

export async function initializeCollection() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      // Create collection with vector configuration
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 384, // Dimension for nomic-embed-text (Ollama)
          distance: 'Cosine',
        },
      });
      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing collection:', error);
    throw error;
  }
}

export async function storeDocumentInQdrant(
  document: StoredDocument,
  vector: number[]
) {
  try {
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: document.id,
          vector: vector,
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
    console.log(`Document ${document.id} stored in Qdrant`);
  } catch (error: any) {
    console.error('Error storing document in Qdrant:', error);
    console.error('Document ID:', document.id);
    console.error('Vector length:', vector.length);
    console.error('Vector sample:', vector.slice(0, 5));
    console.error('Document payload:', document);

    // Try to get the actual error details from Qdrant
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.message) {
      console.error('Error message:', error.message);
    }

    throw error;
  }
}

export async function searchSimilarDocuments(
  queryVector: number[],
  limit: number = 5
) {
  try {
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryVector,
      limit,
      with_payload: true,
    });
    return searchResult;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

export async function getAllDocumentsFromQdrant() {
  try {
    const result = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: 1000,
      with_payload: true,
    });
    return result.points;
  } catch (error) {
    console.error('Error fetching documents from Qdrant:', error);
    throw error;
  }
}

export async function deleteDocumentFromQdrant(documentId: string) {
  try {
    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      points: [documentId],
    });
    console.log(`Document ${documentId} deleted from Qdrant`);
  } catch (error) {
    console.error('Error deleting document from Qdrant:', error);
    throw error;
  }
}