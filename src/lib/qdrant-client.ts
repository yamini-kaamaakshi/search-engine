import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
export const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'documents';

// Initialize Qdrant client
const clientConfig: any = {
  url: QDRANT_URL,
};

if (QDRANT_API_KEY) {
  clientConfig.apiKey = QDRANT_API_KEY;
}

export const qdrantClient = new QdrantClient(clientConfig);

// Vector dimension for Cohere embeddings (embed-english-v3.0 uses 1024 dimensions)
export const VECTOR_SIZE = 1024;

/**
 * Initialize the Qdrant collection
 * Creates the collection if it doesn't exist
 */
export async function initializeCollection(): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (col) => col.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      console.log(`Creating Qdrant collection: ${COLLECTION_NAME}`);

      // Create collection with appropriate vector configuration
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine', // Cosine similarity for semantic search
        },
      });

      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant collection:', error);
    throw new Error(`Failed to initialize Qdrant collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check Qdrant connection health
 */
export async function checkQdrantHealth(): Promise<boolean> {
  try {
    await qdrantClient.getCollections();
    return true;
  } catch (error) {
    console.error('Qdrant health check failed:', error);
    return false;
  }
}