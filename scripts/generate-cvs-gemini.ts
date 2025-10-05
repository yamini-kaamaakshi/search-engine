import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is not set');
  console.error('Please add GEMINI_API_KEY to your .env.local file');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface CVProfile {
  language: string;
  techStack: string[];
  jobTitles: string[];
}

// Define diverse profiles covering mobile development without using the word "mobile"
const cvProfiles: CVProfile[] = [
  // iOS Developers
  { language: 'english', techStack: ['Swift', 'Objective-C', 'Xcode', 'UIKit', 'SwiftUI'], jobTitles: ['iOS Engineer', 'Swift Developer', 'Apple Platform Developer'] },
  { language: 'spanish', techStack: ['Swift', 'iOS SDK', 'CoreData', 'Combine'], jobTitles: ['Desarrollador iOS', 'Ingeniero Swift'] },
  { language: 'french', techStack: ['Swift', 'SwiftUI', 'Xcode', 'TestFlight'], jobTitles: ['Développeur iOS', 'Ingénieur Swift'] },
  { language: 'german', techStack: ['Swift', 'UIKit', 'CoreAnimation', 'ARKit'], jobTitles: ['iOS Entwickler', 'Swift Programmierer'] },

  // Android Developers
  { language: 'english', techStack: ['Kotlin', 'Android Studio', 'Jetpack Compose', 'Room'], jobTitles: ['Android Engineer', 'Kotlin Developer'] },
  { language: 'spanish', techStack: ['Kotlin', 'Android SDK', 'Retrofit', 'Dagger'], jobTitles: ['Desarrollador Android', 'Ingeniero Kotlin'] },
  { language: 'french', techStack: ['Kotlin', 'Android Jetpack', 'Coroutines', 'Firebase'], jobTitles: ['Développeur Android', 'Ingénieur Kotlin'] },
  { language: 'german', techStack: ['Kotlin', 'Android Studio', 'Material Design', 'MVVM'], jobTitles: ['Android Entwickler', 'Kotlin Entwickler'] },

  // React Native Developers
  { language: 'english', techStack: ['React Native', 'JavaScript', 'Redux', 'Expo'], jobTitles: ['React Native Developer', 'Cross-Platform Engineer'] },
  { language: 'spanish', techStack: ['React Native', 'TypeScript', 'Navigation', 'AsyncStorage'], jobTitles: ['Desarrollador React Native'] },
  { language: 'french', techStack: ['React Native', 'Redux Toolkit', 'Native Modules'], jobTitles: ['Développeur React Native'] },

  // Flutter Developers
  { language: 'english', techStack: ['Flutter', 'Dart', 'Provider', 'Firebase'], jobTitles: ['Flutter Developer', 'Dart Engineer'] },
  { language: 'spanish', techStack: ['Flutter', 'Dart', 'BLoC', 'GetX'], jobTitles: ['Desarrollador Flutter'] },
  { language: 'german', techStack: ['Flutter', 'Dart', 'Riverpod', 'SQLite'], jobTitles: ['Flutter Entwickler'] },

  // Backend Developers (Non-mobile)
  { language: 'english', techStack: ['Node.js', 'Express', 'PostgreSQL', 'Docker'], jobTitles: ['Backend Developer', 'Node.js Engineer'] },
  { language: 'spanish', techStack: ['Python', 'Django', 'MySQL', 'Redis'], jobTitles: ['Desarrollador Backend'] },
  { language: 'french', techStack: ['Java', 'Spring Boot', 'MongoDB', 'Kubernetes'], jobTitles: ['Développeur Backend'] },
  { language: 'german', techStack: ['Go', 'PostgreSQL', 'gRPC', 'Microservices'], jobTitles: ['Backend Entwickler'] },

  // Frontend Developers (Non-mobile)
  { language: 'english', techStack: ['React', 'TypeScript', 'Next.js', 'Tailwind'], jobTitles: ['Frontend Developer', 'React Developer'] },
  { language: 'spanish', techStack: ['Vue.js', 'JavaScript', 'Nuxt', 'SCSS'], jobTitles: ['Desarrollador Frontend'] },
  { language: 'french', techStack: ['Angular', 'TypeScript', 'RxJS', 'Material UI'], jobTitles: ['Développeur Frontend'] },
  { language: 'german', techStack: ['React', 'Redux', 'Webpack', 'Jest'], jobTitles: ['Frontend Entwickler'] },

  // Full Stack (with mobile tech)
  { language: 'english', techStack: ['React Native', 'Node.js', 'MongoDB', 'AWS'], jobTitles: ['Full Stack Developer'] },
  { language: 'english', techStack: ['Swift', 'Firebase', 'Cloud Functions', 'REST APIs'], jobTitles: ['Full Stack iOS Developer'] },

  // DevOps/Infrastructure (Non-mobile)
  { language: 'english', techStack: ['AWS', 'Terraform', 'Docker', 'CI/CD'], jobTitles: ['DevOps Engineer', 'Cloud Engineer'] },
  { language: 'french', techStack: ['Azure', 'Kubernetes', 'Jenkins', 'Ansible'], jobTitles: ['Ingénieur DevOps'] },

  // Data/ML (Non-mobile)
  { language: 'english', techStack: ['Python', 'TensorFlow', 'Pandas', 'Jupyter'], jobTitles: ['Data Scientist', 'ML Engineer'] },
  { language: 'spanish', techStack: ['Python', 'PyTorch', 'scikit-learn', 'SQL'], jobTitles: ['Científico de Datos'] },
];

async function generateCV(profile: CVProfile, index: number): Promise<string> {
  const languageInstructions: { [key: string]: string } = {
    english: 'Generate a professional CV in English',
    spanish: 'Genera un CV profesional en español',
    french: 'Générez un CV professionnel en français',
    german: 'Erstellen Sie einen professionellen Lebenslauf auf Deutsch',
  };

  const prompt = `${languageInstructions[profile.language]} for a software developer with the following profile:

Job Titles: ${profile.jobTitles.join(', ')}
Tech Stack: ${profile.techStack.join(', ')}

Create a realistic CV with:
- Full name (realistic for the language)
- Professional summary (2-3 sentences about their expertise)
- Work Experience (2-3 positions, including company names, dates, and responsibilities)
- Technical Skills (${profile.techStack.join(', ')} and related technologies)
- Education
- Projects (1-2 relevant projects)

Important:
- DO NOT use the words "mobile", "app development", or "application development" anywhere in the CV
- Focus on the specific technologies and platforms (${profile.techStack.join(', ')})
- Keep the CV concise (around 400-500 words)
- Make it sound natural and professional
- Include realistic experience (2-7 years)

Generate ONLY the CV text, no additional commentary.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error generating CV ${index}:`, error.message);
    } else {
      console.error(`Error generating CV ${index}:`, error);
    }
    throw error;
  }
}

async function main() {
  console.log('Starting CV generation with Gemini AI...');
  console.log(`Using Gemini API\n`);

  // Create CVs directory if it doesn't exist
  const cvsDir = path.join(process.cwd(), 'generated-cvs');
  if (!fs.existsSync(cvsDir)) {
    fs.mkdirSync(cvsDir, { recursive: true });
  }

  // Generate 100 CVs by repeating and varying the profiles
  const totalCVs = 100;
  let generated = 0;

  for (let i = 0; i < totalCVs; i++) {
    const profile = cvProfiles[i % cvProfiles.length];

    console.log(`Generating CV ${i + 1}/${totalCVs} - ${profile.language} - ${profile.jobTitles[0]}...`);

    try {
      const cvContent = await generateCV(profile, i);

      // Save CV to file
      const filename = `cv_${String(i + 1).padStart(3, '0')}_${profile.language}_${profile.jobTitles[0].replace(/\s+/g, '_')}.txt`;
      const filepath = path.join(cvsDir, filename);

      fs.writeFileSync(filepath, cvContent, 'utf-8');

      generated++;
      console.log(`✓ Saved: ${filename}\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`✗ Failed to generate CV ${i + 1}\n`);
    }
  }

  console.log(`\n✓ Generation complete! Created ${generated} CVs in ${cvsDir}`);
  console.log('\nCV Distribution:');
  console.log(`- iOS/Swift: ~${Math.floor(generated * 0.16)} CVs`);
  console.log(`- Android/Kotlin: ~${Math.floor(generated * 0.16)} CVs`);
  console.log(`- React Native: ~${Math.floor(generated * 0.12)} CVs`);
  console.log(`- Flutter/Dart: ~${Math.floor(generated * 0.12)} CVs`);
  console.log(`- Backend: ~${Math.floor(generated * 0.16)} CVs`);
  console.log(`- Frontend: ~${Math.floor(generated * 0.16)} CVs`);
  console.log(`- Others: ~${Math.floor(generated * 0.12)} CVs`);
}

main().catch(console.error);