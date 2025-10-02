import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { qdrantClient, COLLECTION_NAME, initializeCollection } from '../src/lib/qdrant';
import { generateOllamaEmbedding } from '../src/lib/ollama-embeddings';

async function testUpload() {
  console.log('Testing CV upload and semantic search...\n');

  // Initialize collection
  await initializeCollection();

  const cvsDir = path.join(process.cwd(), 'test-cvs');
  const cvFiles = fs.readdirSync(cvsDir).filter(file => file.endsWith('.txt'));

  console.log(`Found ${cvFiles.length} test CVs\n`);

  // Upload CVs
  for (const filename of cvFiles) {
    console.log(`Processing: ${filename}`);
    const content = fs.readFileSync(path.join(cvsDir, filename), 'utf-8');

    console.log('  → Generating embedding...');
    const embedding = await generateOllamaEmbedding(content);
    console.log(`  → Embedding size: ${embedding.length}`);

    console.log('  → Uploading to Qdrant...');
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [{
        id: uuidv4(),
        vector: embedding,
        payload: {
          filename,
          content,
          type: 'cv',
          uploadDate: new Date().toISOString(),
        },
      }],
    });
    console.log('  ✓ Uploaded\n');
  }

  // Test semantic search
  console.log('\n🔍 Testing Semantic Search:\n');

  const queries = [
    'mobile developers',
    'iOS Swift developer',
    'backend engineer with databases',
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    const queryEmbedding = await generateOllamaEmbedding(query);

    const results = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true,
    });

    results.forEach((result, idx) => {
      const payload = result.payload as any;
      console.log(`  ${idx + 1}. ${payload.filename} (score: ${result.score?.toFixed(4)})`);
    });
    console.log();
  }

  console.log('✓ Test complete!');
}

testUpload().catch(console.error);