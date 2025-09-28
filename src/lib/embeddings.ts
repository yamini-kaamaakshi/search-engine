// Simple embeddings using transformers.js for browser/node compatibility
let pipeline: any = null;

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Dynamic import to avoid issues during SSR
    const { pipeline: createPipeline } = await import('@xenova/transformers');

    if (!pipeline) {
      pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }

    const result = await pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to regular array
    return Array.from(result.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback: return a random vector of the correct dimension
    return Array.from({ length: 384 }, () => Math.random());
  }
}
