# Semantic CV Search Engine with Gemini AI

A Next.js application that demonstrates **semantic search** using **Google's Gemini AI**. This project showcases how semantic search finds relevant CVs based on **intent and meaning** rather than keyword matching.

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

### 2. Configure Gemini API Key

```bash
# Edit .env.local and add your GEMINI_API_KEY
GEMINI_API_KEY=your_gemini_api_key_here
```
Get your free API key: https://aistudio.google.com/app/apikey

### 3. Generate Sample CVs

```bash
npm run generate-cvs
```

This creates 100 multilingual CVs in `generated-cvs/` with iOS, Android, React Native, Flutter, Backend, Frontend, DevOps, and Data Science roles in English, Spanish, French, and German.

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

- **Embeddings**: Gemini `text-embedding-004` (768-dim vectors)
- **Semantic Ranking**: Gemini AI with custom reranking
- **CV Generation**: Gemini `gemini-pro`
- **Storage**: In-memory document store (no external database needed!)
- **Document Processing**: PDF, DOCX, TXT support

## 🔍 How It Works

1. **Document Upload** → Text extraction → Chunking → Gemini embeddings → Store
2. **Search Query** → Gemini AI reranking → Semantic relevance scoring → Top results

The magic is in **Gemini's Language Understanding**:
- Analyzes semantic relationships between query and documents
- Understands: iOS = Mobile development, Android = Mobile development
- Recognizes technology stacks: Swift + UIKit = iOS Developer, Kotlin + Jetpack = Android Developer
- Uses embedding-based similarity as fallback for robust search

## 🧪 Testing Semantic Search

Once you have CVs uploaded, test the semantic search capabilities:

### Test Queries for Mobile Developers (without "mobile" in CVs):
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "mobile developers"}'
```

### Other Test Queries:
- "iOS engineers" → Finds Swift, Xcode, UIKit developers
- "Android specialists" → Finds Kotlin, Jetpack Compose developers
- "cross-platform developers" → Finds React Native, Flutter developers
- "backend developers" → Finds Node.js, Python, Java developers

## 🔄 API Endpoints

### Semantic Search (Gemini AI)
- **Endpoint**: `POST /api/search`
- **Body**: `{ "query": "your search query" }`

### Upload CV
- **Endpoint**: `POST /api/upload`
- **Body**: FormData with `file` field

### List Files
- **Endpoint**: `GET /api/files`

## 📚 Resources

- [Gemini AI Documentation](https://ai.google.dev/docs)
- [Gemini Embeddings Guide](https://ai.google.dev/tutorials/embeddings_quickstart)
- [Gemini API Reference](https://ai.google.dev/api)
- [Get Gemini API Key](https://aistudio.google.com/app/apikey)
