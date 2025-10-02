import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, generateAnswer } from '../../../lib/simple-search';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('Searching for:', query);

    // Search for relevant documents
    const relevantDocs = await searchDocuments(query, 3);

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.",
        sources: [],
      });
    }

    // Additional validation: ensure all results have content
    const validDocs = relevantDocs.filter(doc =>
      doc.filename &&
      doc.content &&
      doc.content.trim().length > 0
    );

    if (validDocs.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded documents related to your question.",
        sources: [],
      });
    }

    // Generate an answer using Ollama
    const answer = await generateAnswer(query, validDocs);

    return NextResponse.json({
      answer,
      sources: validDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content,
        type: doc.type,
        source: doc.source,
        filename: doc.filename,
        chunkIndex: doc.chunkIndex,
        score: doc.score,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Search API is running. Use POST method with query parameter.' },
    { status: 200 }
  );
}