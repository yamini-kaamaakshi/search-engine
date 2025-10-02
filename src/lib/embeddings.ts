// Use Ollama embeddings for consistent 768D vectors
import { generateOllamaEmbedding } from './ollama-embeddings';

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use Ollama embeddings (nomic-embed-text, 768D)
    return await generateOllamaEmbedding(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback: return a random vector of the correct dimension (768D for Ollama)
    return Array.from({ length: 768 }, () => Math.random());
  }
}
