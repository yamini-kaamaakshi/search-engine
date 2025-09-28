import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
});

export const COLLECTION_NAME = 'qa_collection';

export interface QADocument {
  id: string;
  question: string;
  answer: string;
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
          size: 384, // Dimension for sentence-transformers/all-MiniLM-L6-v2
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