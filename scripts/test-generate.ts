import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

async function testGenerate() {
  console.log('Testing CV generation...');
  console.log(`Ollama Host: ${OLLAMA_HOST}`);
  console.log(`Model: ${OLLAMA_MODEL}\n`);

  const testProfiles = [
    {
      language: 'english',
      techStack: ['Swift', 'UIKit', 'Xcode'],
      jobTitle: 'iOS Engineer'
    },
    {
      language: 'english',
      techStack: ['Kotlin', 'Android Studio', 'Jetpack Compose'],
      jobTitle: 'Android Engineer'
    },
    {
      language: 'english',
      techStack: ['Node.js', 'Express', 'PostgreSQL'],
      jobTitle: 'Backend Developer'
    }
  ];

  const cvsDir = path.join(process.cwd(), 'test-cvs');
  if (!fs.existsSync(cvsDir)) {
    fs.mkdirSync(cvsDir, { recursive: true });
  }

  for (let i = 0; i < testProfiles.length; i++) {
    const profile = testProfiles[i];
    console.log(`Generating CV ${i + 1}/${testProfiles.length}: ${profile.jobTitle}...`);

    const prompt = `Generate a professional CV in English for a software developer with the following profile:

Job Title: ${profile.jobTitle}
Tech Stack: ${profile.techStack.join(', ')}

Create a realistic CV with:
- Full name
- Professional summary (2-3 sentences)
- Work Experience (2 positions)
- Technical Skills (${profile.techStack.join(', ')} and related technologies)
- Education

Important:
- DO NOT use the words "mobile", "app development"
- Keep it concise (300-400 words)
- Make it professional

Generate ONLY the CV text:`;

    try {
      const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
      });

      const cvContent = response.data.response;
      const filename = `test_cv_${i + 1}_${profile.jobTitle.replace(/\s+/g, '_')}.txt`;
      fs.writeFileSync(path.join(cvsDir, filename), cvContent, 'utf-8');

      console.log(`✓ Saved: ${filename}\n`);
    } catch (error: any) {
      console.error(`✗ Failed: ${error.message}\n`);
    }
  }

  console.log('Test generation complete!');
}

testGenerate().catch(console.error);