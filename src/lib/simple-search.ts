import { getUploadedDocuments, splitDocumentIntoChunks } from './file-processor';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments, type StoredDocument } from './qdrant';

interface QADocument {
  id: string;
  question: string;
  answer: string;
}

interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  type: 'qa' | 'file';
  source?: string;
  filename?: string;
  chunkIndex?: number;
}

// Simple in-memory store for Q&A documents
let qaDocuments: QADocument[] = [];

export function loadQADocuments() {
  if (qaDocuments.length === 0) {
    // Load the Q&A data
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(process.cwd(), 'data', 'qa-data.json');
    qaDocuments = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  }
  return qaDocuments;
}

function getAllSearchableDocuments(): SearchableDocument[] {
  const documents: SearchableDocument[] = [];

  // Add Q&A documents
  const qaData = loadQADocuments();
  qaData.forEach(qa => {
    documents.push({
      id: qa.id,
      title: qa.question,
      content: `${qa.question} ${qa.answer}`,
      type: 'qa',
      source: qa.question
    });
  });

  // Add uploaded files (split into chunks for better search)
  const uploadedFiles = getUploadedDocuments();
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
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Search similar documents in Qdrant
    const searchResults = await searchSimilarDocuments(queryEmbedding, limit);

    // Convert Qdrant results to our expected format
    const results = searchResults.map(result => {
      const payload = result.payload as unknown as StoredDocument;

      return {
        id: payload.id,
        title: payload.filename,
        content: payload.content,
        type: payload.type === 'qa' ? 'qa' : 'file' as 'qa' | 'file',
        source: payload.filename,
        filename: payload.filename,
        chunkIndex: payload.chunkIndex,
        score: result.score || 0,
      };
    });

    // Also include Q&A documents with simple text search as fallback
    const qaData = loadQADocuments();
    const qaResults = qaData.map(qa => {
      const score = calculateSimilarity(query, `${qa.question} ${qa.answer}`);
      return {
        id: qa.id,
        title: qa.question,
        content: `${qa.question} ${qa.answer}`,
        type: 'qa' as const,
        source: qa.question,
        filename: undefined,
        chunkIndex: undefined,
        score,
      };
    }).filter(result => result.score > 0.1);

    // Combine and sort all results
    const allResults = [...results, ...qaResults];
    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

  } catch (error) {
    console.error('Error in vector search:', error);
    // Fallback to simple text search
    return simpleTextSearch(query, limit);
  }
}

// Keep the old search as a fallback
function simpleTextSearch(query: string, limit: number = 5) {
  const allDocuments = getAllSearchableDocuments();

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
  const context = relevantDocs.map(doc => {
    if (doc.type === 'qa') {
      // For Q&A documents, show as Q&A format
      const qaDoc = doc as QADocument;
      return `Q: ${qaDoc.question}\nA: ${qaDoc.answer}`;
    } else {
      // For file documents, show content with source
      return `Source: ${doc.filename || doc.source}\nContent: ${doc.content}`;
    }
  }).join('\n\n');

  const prompt = `Based on the following information from Q&A pairs and uploaded documents, answer the user's question. If the information is not available in the context, say so.

Context:
${context}

User Question: ${query}

Answer:`;

  return await callOllama(prompt);
}