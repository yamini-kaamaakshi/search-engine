import { getUploadedDocuments, splitDocumentIntoChunks } from './file-processor';
import { generateOllamaEmbedding } from './ollama-embeddings';
import { searchSimilarDocuments } from './qdrant';
import type { StoredDocument } from './qdrant';

interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  type: 'qa' | 'file';
  source?: string;
  filename?: string;
  chunkIndex?: number;
}

async function getAllSearchableDocuments(): Promise<SearchableDocument[]> {
  const documents: SearchableDocument[] = [];

  // Only use uploaded files (no pre-loaded Q&A data)
  const uploadedFiles = await getUploadedDocuments();
  uploadedFiles.forEach(file => {
    const chunks = splitDocumentIntoChunks(file, 500);
    chunks.forEach(chunk => {
      documents.push({
        id: chunk.id,
        title: chunk.filename,
        content: chunk.content,
        type: 'file',
        source: chunk.filename,
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex
      });
    });
  });

  return documents;
}

// Simple text similarity function
function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);

  let matches = 0;
  queryWords.forEach(queryWord => {
    if (textWords.some(textWord => textWord.includes(queryWord) || queryWord.includes(textWord))) {
      matches++;
    }
  });

  return matches / queryWords.length;
}

export async function searchDocuments(query: string, limit: number = 5) {
  try {
    // First try to use vector search with Qdrant
    const queryEmbedding = await generateOllamaEmbedding(query);
    const searchResults = await searchSimilarDocuments(queryEmbedding, limit);

    // Convert Qdrant results to our expected format
    const results = searchResults.map(result => {
      const payload = result.payload as any;

      return {
        id: String(result.id),
        title: payload.filename || 'Untitled',
        content: payload.content || '',
        type: payload.type || 'file',
        source: payload.filename || '',
        filename: payload.filename || '',
        chunkIndex: payload.chunkIndex,
        score: result.score || 0,
      };
    });

    // If we have results from Qdrant, return them
    if (results.length > 0) {
      return results;
    }

    // Otherwise fall back to simple text search
    return simpleTextSearch(query, limit);

  } catch (error) {
    console.error('Error in vector search, falling back to text search:', error);
    // Fallback to simple text search
    return await simpleTextSearch(query, limit);
  }
}

// Simple text-based search as fallback
async function simpleTextSearch(query: string, limit: number = 5) {
  const allDocuments = await getAllSearchableDocuments();

  // If no documents are uploaded, return empty results
  if (allDocuments.length === 0) {
    return [];
  }

  // Calculate similarity scores for each document
  const results = allDocuments.map(doc => {
    const score = calculateSimilarity(query, doc.content);

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      type: doc.type,
      source: doc.source,
      filename: doc.filename,
      chunkIndex: doc.chunkIndex,
      score,
    };
  });

  // Sort by score and return top results
  return results
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Ollama client for generating responses
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

export async function generateAnswer(query: string, relevantDocs: any[]) {
  // If no documents found, return a helpful message
  if (!relevantDocs || relevantDocs.length === 0) {
    return "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.";
  }

  const context = relevantDocs.map(doc => {
    return `Source: ${doc.filename || doc.source}\nContent: ${doc.content}`;
  }).join('\n\n');

  const prompt = `You are a search assistant helping to find relevant CVs/resumes. Based on the provided CVs below, create a helpful summary of the candidates found.

Context - Relevant CVs:
${context}

User Query: ${query}

Instructions:
1. Summarize the key qualifications and experience from each CV
2. Mention the candidate names and their roles
3. Highlight relevant skills and technologies
4. Keep the response concise and professional
5. Always cite the source filename

Provide a summary of the candidates found:`;

  return await callOllama(prompt);
}