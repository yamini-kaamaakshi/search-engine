# Semantic CV Search Engine with Cohere

A Next.js application that demonstrates **semantic search** using **Cohere's AI models**. This project showcases how semantic search finds relevant CVs based on **intent and meaning** rather than keyword matching.

## 🎯 Key Feature: Relevance Search with Indirect Information

**Query:** "Show me top 5 mobile developers"

**What the system finds:**
- CVs with **iOS** expertise (Swift, UIKit, SwiftUI)
- CVs with **Android** skills (Kotlin, Jetpack Compose)
- CVs with **React Native** or **Flutter** experience
- Cross-platform developers

**Important:** The CVs don't contain "mobile" or "mobile developer" - the system understands that iOS, Android, React Native, and Flutter are mobile technologies!

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Cohere API
```bash
cp .env.example .env.local
# Edit .env.local and add your COHERE_API_KEY
```

Get your free API key: https://dashboard.cohere.com/api-keys

### 3. Generate Sample CVs
```bash
npm run generate-cvs
```

This creates 100 multilingual CVs in `generated-cvs/` with iOS, Android, React Native, Flutter, Backend, Frontend, DevOps, and Data Science roles.

### 4. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📝 Usage

1. **Upload CVs**: Upload the generated CVs from `generated-cvs/` folder
2. **Search Semantically**: Try queries like:
   - "mobile developers" → Finds iOS, Android, React Native, Flutter
   - "Apple ecosystem" → Finds iOS, Swift developers
   - "Google platform" → Finds Android, Kotlin developers
   - "cross-platform" → Finds React Native, Flutter developers

## 🏗️ Architecture

- **Embeddings**: Cohere `embed-english-v3.0` (1024-dim vectors)
- **Semantic Ranking**: Cohere `rerank-english-v3.0`
- **CV Generation**: Cohere `command-r-plus-08-2024`
- **Storage**: In-memory document store with embeddings
- **Document Processing**: PDF, DOCX, TXT support

## 🔍 How It Works

1. **Document Upload** → Text extraction → Chunking → Cohere embeddings → Store
2. **Search Query** → Cohere rerank API → Semantic relevance scoring → Top results

The magic is in **Cohere Rerank** which understands:
- iOS = Mobile development
- Android = Mobile development
- Swift + UIKit = iOS development
- Kotlin + Jetpack = Android development

## 📚 Resources

- [Cohere Documentation](https://docs.cohere.com/)
- [Cohere Embed API](https://docs.cohere.com/reference/embed)
- [Cohere Rerank API](https://docs.cohere.com/reference/rerank)
