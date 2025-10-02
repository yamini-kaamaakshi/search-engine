# Relevance Search with Semantic Understanding

## Overview

This implementation demonstrates **semantic search** that can find relevant CVs based on indirect information. When you search for "mobile developers", it intelligently returns CVs mentioning iOS, Android, Swift, Kotlin, React Native, Flutter, etc., even though they never explicitly say "mobile developer".

## How It Works

### 1. **Semantic Embeddings**
- Uses Ollama's `nomic-embed-text` model to convert text into 768-dimensional vectors
- These vectors capture the **meaning** of text, not just keywords
- Similar concepts (like "iOS engineer" and "mobile developer") have similar vector representations

### 2. **Vector Database (Qdrant)**
- Stores CV embeddings in Qdrant for efficient similarity search
- Uses cosine similarity to find semantically similar documents
- Returns top results based on semantic relevance, not keyword matching

### 3. **Multi-language Support**
- CVs generated in English, Spanish, French, and German
- Semantic search works across languages because embeddings capture meaning

## Setup & Usage

### Prerequisites
- Ollama installed and running
- Qdrant running on port 6333
- Node.js and npm

### Step 1: Generate 100 CVs

```bash
npm run generate-cvs
```

This creates 100 diverse CVs with:
- **Mobile developers**: iOS (Swift), Android (Kotlin), React Native, Flutter
- **Backend developers**: Node.js, Python, Java, Go
- **Frontend developers**: React, Vue, Angular
- **Other roles**: DevOps, Data Scientists
- **Multiple languages**: English, Spanish, French, German

CVs are saved in `generated-cvs/` directory.

### Step 2: Upload CVs to Qdrant

```bash
npm run upload-cvs
```

This script:
1. Reads all CVs from `generated-cvs/`
2. Generates embeddings using Ollama
3. Stores them in Qdrant vector database
4. Runs test queries to verify the system

### Step 3: Start the Application

```bash
npm run dev
```

Visit http://localhost:3000 and search for:
- "mobile developers" → Returns iOS, Android, React Native, Flutter CVs
- "iOS developer with Swift" → Returns Swift/iOS CVs
- "backend developer with Python" → Returns Python backend CVs
- "desarrollador Android" → Returns Android CVs (works in Spanish!)

## Example: Finding Mobile Developers

When you search for **"mobile developers"**, the system:

1. Converts your query to a vector embedding
2. Searches Qdrant for similar vectors
3. Returns CVs with high similarity scores

**Results include:**
- iOS Engineer with Swift, Xcode, UIKit
- Android Engineer with Kotlin, Android Studio
- React Native Developer
- Flutter Developer with Dart
- Cross-Platform Engineer

**Why it works:**
- The embedding model understands that "iOS engineer" is semantically similar to "mobile developer"
- It knows Swift and Kotlin are mobile technologies
- No hardcoded keyword matching required!

## Technical Architecture

```
User Query: "mobile developers"
     ↓
Ollama (nomic-embed-text) → Query Embedding [768 dimensions]
     ↓
Qdrant Vector DB → Cosine Similarity Search
     ↓
Top 5 Most Similar CVs (by semantic meaning)
     ↓
Display Results with Scores
```

## Key Files

- `scripts/generate-cvs.ts` - AI-powered CV generation using Ollama
- `scripts/upload-cvs.ts` - Upload CVs to Qdrant with embeddings
- `src/lib/ollama-embeddings.ts` - Ollama embedding generation
- `src/lib/qdrant.ts` - Qdrant vector database operations
- `src/lib/simple-search.ts` - Semantic search implementation
- `src/app/api/search/route.ts` - Search API endpoint

## Environment Variables

Already configured in `.env.local`:

```env
AI_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=search-engine
```

## Understanding Semantic Search vs Keyword Search

### Keyword Search (Traditional)
- Query: "mobile developers"
- Matches: Only documents containing "mobile" or "developers"
- Misses: iOS, Android, Swift, Kotlin developers (no keyword match)

### Semantic Search (This Implementation)
- Query: "mobile developers"
- Matches: Documents about iOS, Android, React Native, Flutter
- Understands: "iOS engineer" means mobile developer, even without keywords

## Testing

After running `npm run upload-cvs`, you'll see test results for queries like:
- "mobile developers" → iOS, Android, React Native CVs
- "iOS developer with Swift experience" → Swift CVs
- "Android Kotlin engineer" → Android CVs
- "backend developer with Python" → Python backend CVs
- "frontend React developer" → React CVs

The scores (0.0 to 1.0) indicate semantic similarity, with higher scores meaning more relevant matches.

## Troubleshooting

### Ollama not responding
```bash
ollama list  # Check if models are available
ollama pull nomic-embed-text  # Pull embedding model if needed
```

### Qdrant connection issues
```bash
curl http://localhost:6333/collections  # Check if Qdrant is running
```

### Reset the collection
```bash
curl -X DELETE http://localhost:6333/collections/search-engine
```

Then re-run `npm run upload-cvs`.

## Next Steps

1. Generate more CVs with different profiles
2. Experiment with different queries
3. Adjust the embedding model for better results
4. Add filters (e.g., years of experience, location)
5. Implement re-ranking for better precision

---

**Key Insight**: Semantic search understands that "mobile developer" encompasses iOS, Android, React Native, and Flutter developers, even when CVs don't explicitly mention "mobile". This is the power of vector embeddings! 🚀