import { getUploadedDocuments, splitDocumentIntoChunks } from './file-processor';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments, type StoredDocument } from './qdrant';
import { tools, executeTools } from './tools';

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
    const queryEmbedding = await generateEmbedding(query);
    const searchResults = await searchSimilarDocuments(queryEmbedding, limit);

    // Convert Qdrant results to our expected format
    const results = searchResults.map(result => {
      const payload = result.payload as unknown as StoredDocument;

      return {
        id: payload.id,
        title: payload.filename,
        content: payload.content,
        type: 'file' as const,
        source: payload.filename,
        filename: payload.filename,
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
    return simpleTextSearch(query, limit);
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

// Helper function to detect if query needs tool calling
function needsToolCalling(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Weather keywords
  const weatherKeywords = ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'cloudy', 'hot', 'cold'];
  // Flight keywords
  const flightKeywords = ['flight', 'airline', 'departure', 'arrival', 'flying', 'plane'];

  return weatherKeywords.some(kw => lowerQuery.includes(kw)) ||
         flightKeywords.some(kw => lowerQuery.includes(kw));
}

// Function to determine which tools to call based on query
async function determineToolCalls(query: string): Promise<any[]> {
  const toolsDescription = tools.map(tool =>
    `- ${tool.name}: ${tool.description}`
  ).join('\n');

  const prompt = `You are a function calling assistant. Given a user query, determine which tools to call and with what arguments.

Available tools:
${toolsDescription}

User query: "${query}"

If the query requires calling a tool, respond with ONLY a JSON array of tool calls in this exact format:
[{"name": "tool_name", "arguments": {"param": "value"}}]

If NO tool is needed (e.g., the query is about uploaded documents), respond with ONLY:
[]

Examples:
Query: "What's the weather in London?"
Response: [{"name": "get_current_weather", "arguments": {"location": "London, UK", "unit": "celsius"}}]

Query: "Flight status for BA456"
Response: [{"name": "get_flight_info", "arguments": {"flight_number": "BA456"}}]

Query: "What does the document say about sales?"
Response: []

Now analyze the user query and respond with ONLY the JSON array (no other text):`;

  try {
    const response = await callOllama(prompt);
    // Extract JSON from response - look for array pattern
    const jsonMatch = response.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('Error determining tool calls:', error);
    return [];
  }
}

export async function generateAnswer(query: string, relevantDocs: any[]) {
  // Check if query needs real-time API data
  if (needsToolCalling(query)) {
    try {
      // Determine which tools to call
      const toolCalls = await determineToolCalls(query);

      if (toolCalls.length > 0) {
        console.log('Executing tools:', toolCalls);

        // Execute the tools
        const toolResults = await executeTools(toolCalls);

        // Generate answer using tool results
        const toolContext = toolResults.map(tr =>
          `Tool: ${tr.tool}\nArguments: ${JSON.stringify(tr.arguments)}\nResult: ${JSON.stringify(tr.result, null, 2)}`
        ).join('\n\n');

        const prompt = `You are a helpful assistant that provides information based on real-time data from APIs.

Tool Results:
${toolContext}

User Question: ${query}

Based on the tool results above, provide a concise, structured answer with key information only. Format as bullet points or short sentences with actual data values (temperature, humidity, wind speed, etc.). Do not add unnecessary conversational text or advice. Just present the facts clearly.`;

        return await callOllama(prompt);
      }
    } catch (error) {
      console.error('Tool calling error:', error);
      // Fall through to document search
    }
  }

  // Original document-based search logic
  if (!relevantDocs || relevantDocs.length === 0) {
    return "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.";
  }

  const context = relevantDocs.map(doc => {
    return `Source: ${doc.filename || doc.source}\nContent: ${doc.content}`;
  }).join('\n\n');

  const prompt = `You are a search assistant that can only answer questions based on the provided document context. You must strictly adhere to the following rules:

1. ONLY use information from the provided context below
2. If the information is not available in the context, respond with "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question."
3. Do NOT use any external knowledge or information not present in the context
4. Always cite the source filename when providing information

Context from uploaded documents:
${context}

User Question: ${query}

Answer based ONLY on the above context:`;

  return await callOllama(prompt);
}