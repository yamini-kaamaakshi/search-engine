import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found in environment variables');
}

export interface DocumentForRerank {
  id: string;
  content: string;
  filename?: string;
  type?: string;
  uploadDate?: string;
  chunkIndex?: number;
  parentDocumentId?: string;
}

// Initialize Gemini AI
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Generate embeddings using Gemini's text-embedding-004 model
 * This model produces 768-dimensional embeddings optimized for semantic search
 */
export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY || !genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(text);
    const embedding = result.embedding;

    return embedding.values;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Gemini API error:', error.message);
      throw error;
    }
    throw new Error('Gemini embedding failed: Unknown error');
  }
}

/**
 * Generate embeddings for multiple texts in a single batch request
 */
export async function generateGeminiEmbeddingBatch(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY || !genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.batchEmbedContents({
      requests: texts.map(text => ({ content: { parts: [{ text }] } })),
    });

    return result.embeddings.map(emb => emb.values);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Gemini API error:', error.message);
      throw error;
    }
    throw new Error('Gemini batch embedding failed: Unknown error');
  }
}

/**
 * Generate query embedding (same as document embedding for Gemini)
 */
export async function generateGeminiQueryEmbedding(query: string): Promise<number[]> {
  return generateGeminiEmbedding(query);
}

/**
 * Rerank documents using Gemini's language understanding capabilities
 * Since Gemini doesn't have a dedicated rerank API, we'll use the generative model
 * to analyze relevance
 */
export async function rerankDocumentsWithGemini(
  query: string,
  documents: DocumentForRerank[],
  topN: number = 5
): Promise<Array<DocumentForRerank & { relevance_score: number }>> {
  if (!GEMINI_API_KEY || !genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (documents.length === 0) {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Create a prompt that asks Gemini to rank the documents
    const prompt = `You are a STRICT relevance scoring system for job/CV matching. Score based on PRIMARY job role match.

Search Query: "${query}"

Documents:
${documents.map((doc, idx) => `[${idx}] ${doc.content.substring(0, 500)}...`).join('\n\n')}

SCORING RULES:
Score 0.8-1.0: PRIMARY job role matches the query (exact or category match)
Score 0.0-0.2: Different PRIMARY job role (even if they share skills/technologies)

CRITICAL: Understand GENERIC vs SPECIFIC queries:

GENERIC queries (broad categories):
- "mobile developer" → MATCHES iOS, Android, React Native, Flutter developers (0.8-1.0)
- "backend developer" → MATCHES Node.js, Python, Java backend developers (0.8-1.0)
- "frontend developer" → MATCHES React, Vue, Angular developers (0.8-1.0)

SPECIFIC queries (exact technologies/roles):
- "Java developer" → ONLY matches Java/JVM backend (0.8-1.0), NOT Android (0.0-0.2)
- "iOS developer" → ONLY matches iOS (0.8-1.0), NOT Android (0.0-0.2)
- "React developer" → ONLY matches React frontend (0.8-1.0), NOT Vue/Angular (0.0-0.2)

KEY PRINCIPLE:
- Generic query → Match ANY specific role in that category
- Specific query → Match ONLY that specific role, NOT related roles

Examples:
Query: "mobile developer" (GENERIC)
- iOS Engineer → 0.9 ✓
- Android Developer → 0.9 ✓
- Java Backend → 0.1 ✗

Query: "Java developer" (SPECIFIC)
- Java Backend Developer → 0.9 ✓
- Android Developer (uses Java) → 0.1 ✗
- Python Backend → 0.1 ✗

Respond ONLY with JSON array:
[{"index": 2, "score": 0.95}, {"index": 0, "score": 0.15}]

JSON Response:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini');
    }

    const scores: Array<{ index: number; score: number }> = JSON.parse(jsonMatch[0]);

    // Map the scores back to documents and limit to topN
    const rerankedDocs = scores
      .slice(0, topN)
      .map(({ index, score }) => ({
        ...documents[index],
        relevance_score: score,
      }));

    return rerankedDocs;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Gemini rerank error:', error.message);

      // Fallback: use cosine similarity with embeddings
      console.log('Falling back to embedding-based similarity...');
      return await rerankWithEmbeddings(query, documents, topN);
    }
    throw new Error('Gemini rerank failed: Unknown error');
  }
}

/**
 * Fallback reranking using cosine similarity of embeddings
 */
async function rerankWithEmbeddings(
  query: string,
  documents: DocumentForRerank[],
  topN: number
): Promise<Array<DocumentForRerank & { relevance_score: number }>> {
  // Generate query embedding
  const queryEmbedding = await generateGeminiQueryEmbedding(query);

  // Generate embeddings for all documents
  const docTexts = documents.map(doc => doc.content.substring(0, 1000));
  const docEmbeddings = await generateGeminiEmbeddingBatch(docTexts);

  // Calculate cosine similarities
  const similarities = docEmbeddings.map((docEmb, idx) => ({
    index: idx,
    score: cosineSimilarity(queryEmbedding, docEmb),
  }));

  // Sort by similarity and return top N
  similarities.sort((a, b) => b.score - a.score);

  return similarities.slice(0, topN).map(({ index, score }) => ({
    ...documents[index],
    relevance_score: score,
  }));
}

/**
 * Calculate cosine similarity between two vectors
 * Used for embedding-based search
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}