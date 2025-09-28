import { Document } from 'llamaindex';
import { createIndex } from '../src/lib/llamaindex';
import * as fs from 'fs';
import * as path from 'path';

interface QADocument {
  id: string;
  question: string;
  answer: string;
}

async function ingestData() {
  try {
    console.log('Starting data ingestion...');

    // Load Q&A data
    const dataPath = path.join(process.cwd(), 'data', 'qa-data.json');
    const qaData: QADocument[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Convert Q&A data to LlamaIndex documents
    const documents = qaData.map((qa) => {
      const text = `Question: ${qa.question}\nAnswer: ${qa.answer}`;
      return new Document({
        text,
        metadata: {
          id: qa.id,
          question: qa.question,
          answer: qa.answer,
          type: 'qa',
        },
      });
    });

    console.log(`Processing ${documents.length} documents...`);

    // Create vector index
    const index = await createIndex(documents);

    console.log('Data ingestion completed successfully!');
    console.log(`Indexed ${documents.length} Q&A pairs`);
  } catch (error) {
    console.error('Error during data ingestion:', error);
    process.exit(1);
  }
}

// Run the ingestion
if (require.main === module) {
  ingestData();
}