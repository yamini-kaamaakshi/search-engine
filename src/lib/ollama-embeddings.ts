import axios from 'axios';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';

export async function generateOllamaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/embeddings`, {
      model: OLLAMA_EMBEDDING_MODEL,
      prompt: text,
    });

    return response.data.embedding;
  } catch (error) {
    console.error('Error generating Ollama embedding:', error);
    throw error;
  }
}

export async function generateOllamaEmbeddingBatch(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map(text => generateOllamaEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
}