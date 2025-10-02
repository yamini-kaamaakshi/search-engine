import { NextRequest, NextResponse } from 'next/server';
import { generateOllamaEmbedding } from '../../../lib/ollama-embeddings';
import { qdrantClient, COLLECTION_NAME } from '../../../lib/qdrant';

export async function GET(request: NextRequest) {
  try {
    const query = 'mobile developer';

    console.log('=== Test Search Debug ===');
    console.log('Query:', query);
    console.log('Collection:', COLLECTION_NAME);

    // Generate embedding
    console.log('Generating embedding...');
    const queryEmbedding = await generateOllamaEmbedding(query);
    console.log('Embedding size:', queryEmbedding.length);

    // Search Qdrant
    console.log('Searching Qdrant...');
    const searchResults = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: 5,
      with_payload: true,
    });

    console.log('Results found:', searchResults.length);

    const formattedResults = searchResults.map(result => ({
      id: result.id,
      score: result.score,
      filename: (result.payload as any)?.filename,
      contentPreview: (result.payload as any)?.content?.substring(0, 200),
    }));

    return NextResponse.json({
      success: true,
      query,
      collection: COLLECTION_NAME,
      embeddingSize: queryEmbedding.length,
      resultsCount: searchResults.length,
      results: formattedResults,
    });
  } catch (error: any) {
    console.error('Test search error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}