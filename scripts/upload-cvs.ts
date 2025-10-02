import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { qdrantClient, COLLECTION_NAME, initializeCollection } from '../src/lib/qdrant';
import { generateOllamaEmbedding } from '../src/lib/ollama-embeddings';

async function uploadCVs() {
  console.log('Starting CV upload to Qdrant...\n');

  // Initialize collection
  await initializeCollection();

  // Check for both test-cvs and generated-cvs directories
  const testCvsDir = path.join(process.cwd(), 'test-cvs');
  const generatedCvsDir = path.join(process.cwd(), 'generated-cvs');

  let cvsDir: string;
  let cvFiles: string[] = [];

  // Prefer test-cvs if it exists and has files
  if (fs.existsSync(testCvsDir)) {
    const testFiles = fs.readdirSync(testCvsDir).filter(file => file.endsWith('.txt'));
    if (testFiles.length > 0) {
      cvsDir = testCvsDir;
      cvFiles = testFiles;
      console.log(`Using test-cvs directory (${testFiles.length} files)\n`);
    }
  }

  // Fall back to generated-cvs
  if (cvFiles.length === 0 && fs.existsSync(generatedCvsDir)) {
    const generatedFiles = fs.readdirSync(generatedCvsDir).filter(file => file.endsWith('.txt'));
    if (generatedFiles.length > 0) {
      cvsDir = generatedCvsDir;
      cvFiles = generatedFiles;
      console.log(`Using generated-cvs directory (${generatedFiles.length} files)\n`);
    }
  }

  // If neither directory has files, exit
  if (cvFiles.length === 0) {
    console.error('Error: No CV files found in test-cvs or generated-cvs directories!');
    console.log('Please add CV files to test-cvs/ or run "npm run generate-cvs" first.');
    process.exit(1);
  }

  console.log(`Found ${cvFiles.length} CV files to upload.\n`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < cvFiles.length; i++) {
    const filename = cvFiles[i];
    const filepath = path.join(cvsDir, filename);

    try {
      console.log(`[${i + 1}/${cvFiles.length}] Processing: ${filename}`);

      // Read CV content
      const content = fs.readFileSync(filepath, 'utf-8');

      // Generate embedding using Ollama
      console.log('  → Generating embedding...');
      const embedding = await generateOllamaEmbedding(content);

      console.log(`  → Embedding size: ${embedding.length}`);

      // Store in Qdrant
      console.log('  → Uploading to Qdrant...');
      const documentId = uuidv4();

      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: documentId,
            vector: embedding,
            payload: {
              filename: filename,
              content: content,
              type: 'cv',
              uploadDate: new Date().toISOString(),
            },
          },
        ],
      });

      uploaded++;
      console.log(`  ✓ Successfully uploaded\n`);

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error: any) {
      failed++;
      console.error(`  ✗ Failed: ${error.message}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Upload Summary:');
  console.log(`  Total CVs: ${cvFiles.length}`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(50));

  // Test search
  console.log('\n🔍 Testing semantic search...\n');

  const testQueries = [
    'mobile developers',
    'iOS developer with Swift experience',
    'Android Kotlin engineer',
    'backend developer with Python',
    'frontend React developer',
  ];

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    const queryEmbedding = await generateOllamaEmbedding(query);

    const results = await qdrantClient.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true,
    });

    console.log(`  Found ${results.length} results:`);
    results.forEach((result, idx) => {
      const payload = result.payload as any;
      console.log(`    ${idx + 1}. ${payload.filename} (score: ${result.score?.toFixed(4)})`);
    });
    console.log();
  }

  console.log('✓ Upload and testing complete!');
}

uploadCVs().catch(console.error);