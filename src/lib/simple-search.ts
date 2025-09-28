interface QADocument {
  id: string;
  question: string;
  answer: string;
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

export function searchDocuments(query: string, limit: number = 3) {
  const documents = loadQADocuments();

  // Calculate similarity scores for each document
  const results = documents.map(doc => {
    const questionSimilarity = calculateSimilarity(query, doc.question);
    const answerSimilarity = calculateSimilarity(query, doc.answer);
    const score = Math.max(questionSimilarity, answerSimilarity);

    return {
      ...doc,
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

export async function generateAnswer(query: string, relevantDocs: QADocument[]) {
  const context = relevantDocs.map(doc =>
    `Q: ${doc.question}\nA: ${doc.answer}`
  ).join('\n\n');

  const prompt = `Based on the following Q&A pairs, answer the user's question. If the information is not available in the context, say so.

Context:
${context}

User Question: ${query}

Answer:`;

  return await callOllama(prompt);
}