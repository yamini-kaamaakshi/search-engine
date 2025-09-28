import {
  VectorStoreIndex,
  Document,
} from 'llamaindex';

// Global index variable to store our created index
let globalIndex: VectorStoreIndex | null = null;

export async function createIndex(documents: Document[]) {
  try {
    globalIndex = await VectorStoreIndex.fromDocuments(documents);
    return globalIndex;
  } catch (error) {
    console.error('Error creating index:', error);
    throw error;
  }
}

export async function loadIndex() {
  try {
    if (!globalIndex) {
      throw new Error('Index not created yet. Please run ingestion first.');
    }
    return globalIndex;
  } catch (error) {
    console.error('Error loading index:', error);
    throw error;
  }
}

// Ollama client for direct API calls
export async function callOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${process.env.OLLAMA_HOST || 'http://localhost:11434'}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw error;
  }
}