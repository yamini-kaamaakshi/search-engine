# Quick Start Guide - Semantic CV Search

## What This Does

Demonstrates **semantic search** that finds "mobile developers" even when CVs only mention specific technologies like iOS, Android, Swift, Kotlin - without ever using the word "mobile".

## Quick Test (5 minutes)

### 1. Generate Test CVs (3 samples)
```bash
npx tsx scripts/test-generate.ts
```

This creates 3 CVs in `test-cvs/`:
- iOS Engineer (Swift, UIKit, Xcode)
- Android Engineer (Kotlin, Android Studio)
- Backend Developer (Node.js, PostgreSQL)

**Key Point**: None of these CVs mention "mobile" or "app developer"!

### 2. Upload to Vector Database
```bash
npx tsx scripts/test-upload.ts
```

This:
- Generates embeddings using Ollama
- Stores them in Qdrant
- **Runs test searches to prove it works!**

You'll see output like:
```
Query: "mobile developers"
  1. test_cv_2_Android_Engineer.txt (score: 0.5962)
  2. test_cv_1_iOS_Engineer.txt (score: 0.5641)
  3. test_cv_3_Backend_Developer.txt (score: 0.5156)
```

**It works!** Even though no CV says "mobile", semantic search ranks iOS and Android CVs higher!

## Full Workflow (Generate 100 CVs)

### 1. Generate 100 Diverse CVs
```bash
npm run generate-cvs
```

This takes ~10-15 minutes and creates 100 CVs with:
- 40% mobile (iOS, Android, React Native, Flutter)
- 30% web (Backend, Frontend)
- 30% other (DevOps, Data Science, etc.)
- Multiple languages (English, Spanish, French, German)

### 2. Upload All CVs to Qdrant
```bash
npm run upload-cvs
```

This processes all 100 CVs and runs test queries automatically.

### 3. Start the Application
```bash
npm run dev
```

Open http://localhost:3000 and search!

## Test Queries

Try these searches to see semantic understanding:

1. **"mobile developers"**
   - Returns: iOS, Android, React Native, Flutter CVs
   - Even though none say "mobile developer"!

2. **"iOS developer with Swift experience"**
   - Returns: iOS/Swift CVs ranked highest

3. **"Android Kotlin engineer"**
   - Returns: Android/Kotlin CVs

4. **"backend developer with Python"**
   - Returns: Python backend CVs

5. **"desarrollador Android"** (Spanish)
   - Returns: Android CVs (cross-language search!)

## Why This Works

Traditional keyword search:
```
Query: "mobile developers"
Result: ❌ No matches (CVs don't contain "mobile")
```

Semantic search (this implementation):
```
Query: "mobile developers"
Embedding: [0.123, -0.456, 0.789, ...] (768 dimensions)
          ↓
Find similar embeddings in vector DB
          ↓
Result: ✓ iOS, Android, React Native, Flutter CVs
```

The embedding model understands that:
- iOS Engineer ≈ Mobile Developer
- Swift + UIKit ≈ Mobile Technology
- Android Studio ≈ Mobile Development Platform

## Cleanup

Delete test data:
```bash
rm -rf test-cvs/
curl -X DELETE http://localhost:6333/collections/documents_collection
```

## Next Steps

1. Generate the full 100 CVs: `npm run generate-cvs`
2. Upload them: `npm run upload-cvs`
3. Explore the web interface
4. Read `RELEVANCE_SEARCH_GUIDE.md` for technical details

---

**The Magic**: Semantic search finds relevant results based on *meaning*, not just keywords! 🎯