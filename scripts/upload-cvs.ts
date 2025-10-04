import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function uploadCV(filePath: string, filename: string): Promise<boolean> {
  try {
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream, filename);

    const response = await axios.post(`${API_URL}/api/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data.success;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error: ${error.response?.data?.error || error.message}`);
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