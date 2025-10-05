import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function uploadCV(filePath: string, filename: string): Promise<boolean> {
  try {
    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Create FormData with File (Node.js 18+ has native FormData and File)
    const formData = new FormData();
    const file = new File([fileContent], filename, { type: 'text/plain' });
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || response.statusText);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error:`, error);
    }
    return false;
  }
}

async function uploadCVs() {
  console.log(`Starting CV upload to ${API_URL}...\n`);

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

  // Upload first 20 CVs for testing
  const filesToUpload = cvFiles.slice(0, 20);

  for (let i = 0; i < filesToUpload.length; i++) {
    const filename = filesToUpload[i];
    const filepath = path.join(cvsDir, filename);

    console.log(`[${i + 1}/${filesToUpload.length}] Uploading ${filename}...`);

    const success = await uploadCV(filepath, filename);

    if (success) {
      uploaded++;
      console.log(`  ✓ Success\n`);
    } else {
      failed++;
      console.log(`  ✗ Failed\n`);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log('Upload Summary:');
  console.log(`  Total CVs: ${filesToUpload.length}`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(50));
  console.log('\n✓ Upload complete!');
  console.log('\nYou can now test semantic search by visiting:');
  console.log(`  ${API_URL}`);
  console.log('\nTry searching for:');
  console.log('  - "mobile developers"');
  console.log('  - "iOS developer with Swift"');
  console.log('  - "Android Kotlin engineer"');
  console.log('  - "backend developer with Python"');
}

uploadCVs().catch(console.error);