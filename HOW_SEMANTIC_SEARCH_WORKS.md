# How Semantic Search Works - Technical Deep Dive

## The Problem

**Query**: "Show me top 5 mobile developers"

**Challenge**: Your CVs contain:
- "iOS Engineer with Swift and UIKit experience"
- "Android Developer using Kotlin and Jetpack Compose"
- "React Native specialist"
- "Flutter engineer with 5 years experience"

**Issue**: None of these CVs contain the words "mobile" or "developer"!

Traditional keyword search would return **zero results** ❌

## The Solution: Semantic Search with Vector Embeddings

### Step 1: Convert Text to Meaning (Embeddings)

**What is an embedding?**
- A vector (array of numbers) that represents the *meaning* of text
- Similar concepts = Similar vectors
- Ollama's `nomic-embed-text` creates 768-dimensional vectors

**Example:**

```
Text: "iOS Engineer with Swift experience"
Embedding: [0.234, -0.567, 0.123, 0.890, ..., 0.456] (768 numbers)

Text: "Mobile developer specializing in Apple platforms"
Embedding: [0.221, -0.543, 0.134, 0.876, ..., 0.443] (768 numbers)
         ↑ Very similar numbers = Similar meaning!
```

### Step 2: Store Embeddings in Vector Database

**Qdrant** (local vector database):
```
CV #1 → Embedding [0.234, -0.567, ...] + Metadata (filename, content)
CV #2 → Embedding [0.221, -0.543, ...] + Metadata
CV #3 → Embedding [-0.145, 0.823, ...] + Metadata
...
CV #100 → Embedding [...]
```

### Step 3: Semantic Search (Cosine Similarity)

**Query**: "mobile developers"

1. **Convert query to embedding**:
   ```
   "mobile developers" → [0.245, -0.556, 0.118, 0.901, ...]
   ```

2. **Find similar vectors** (cosine similarity):
   ```
   CV #1 (iOS Engineer):     cosine_similarity = 0.89 ✓ High match!
   CV #2 (Android Developer): cosine_similarity = 0.87 ✓ High match!
   CV #3 (Backend Developer): cosine_similarity = 0.52   Lower match
   ```

3. **Return top results**:
   - iOS Engineer (score: 0.89)
   - Android Developer (score: 0.87)
   - React Native Developer (score: 0.85)
   - Flutter Engineer (score: 0.84)
   - Backend Developer (score: 0.52)

## Why It Understands "Indirect Information"

The embedding model is trained on massive amounts of text and learns relationships:

```
"mobile developer" is semantically similar to:
  → "iOS engineer"
  → "Android developer"
  → "React Native specialist"
  → "Flutter engineer"

"mobile technologies" are semantically similar to:
  → "Swift, UIKit, Xcode" (iOS)
  → "Kotlin, Android Studio" (Android)
  → "React Native, Expo"
  → "Flutter, Dart"
```

This knowledge is **encoded in the 768-dimensional vector space**.

## Mathematical Explanation

### Cosine Similarity Formula

```
similarity(A, B) = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product of vectors A and B
- ||A|| = magnitude (length) of vector A
- ||B|| = magnitude of vector B
```

**Range**: -1 to 1 (we use 0 to 1 for text)
- 1.0 = Identical meaning
- 0.8-0.9 = Very similar
- 0.5-0.7 = Somewhat related
- 0.0-0.4 = Not very related

### Example Calculation

```python
query_vector = [0.5, 0.3, 0.8]
ios_cv_vector = [0.6, 0.4, 0.7]
backend_cv_vector = [0.1, 0.9, 0.2]

# Cosine similarity
similarity_ios = cosine_similarity(query_vector, ios_cv_vector)
# Result: 0.89 (very similar!)

similarity_backend = cosine_similarity(query_vector, backend_cv_vector)
# Result: 0.52 (less similar)
```

## Real Example from Our Implementation

### Query: "mobile developers"

**Results:**

| Rank | CV | Score | Why? |
|------|----|----|------|
| 1 | Android Engineer (Kotlin) | 0.5962 | "Android" strongly associated with mobile |
| 2 | iOS Engineer (Swift) | 0.5641 | "iOS" strongly associated with mobile |
| 3 | Backend Developer (Node.js) | 0.5156 | Not mobile-specific, lower score |

**Notice**: Even though NO CV contains "mobile", the top results are mobile developers!

### Query: "iOS Swift developer"

| Rank | CV | Score | Why? |
|------|----|----|------|
| 1 | iOS Engineer (Swift) | 0.5832 | Exact match on iOS & Swift |
| 2 | Android Engineer | 0.5310 | Similar domain (mobile) |
| 3 | Backend Developer | 0.4766 | Different domain |

### Query: "backend engineer with databases"

| Rank | CV | Score | Why? |
|------|----|----|------|
| 1 | Backend Developer (PostgreSQL) | 0.6378 | Perfect match |
| 2 | Android Engineer | 0.5350 | May use databases |
| 3 | iOS Engineer | 0.5086 | Less database-focused |

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DATA PREPARATION                                         │
├─────────────────────────────────────────────────────────────┤
│ Generate 100 CVs with Ollama (AI)                           │
│ - iOS, Android, React Native, Flutter (mobile)              │
│ - Backend, Frontend (web)                                   │
│ - DevOps, Data Science (other)                              │
│ - Multiple languages (EN, ES, FR, DE)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EMBEDDING GENERATION                                      │
├─────────────────────────────────────────────────────────────┤
│ For each CV:                                                 │
│   CV Text → Ollama (nomic-embed-text) → 768D Vector         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. VECTOR STORAGE (Qdrant)                                   │
├─────────────────────────────────────────────────────────────┤
│ Store each vector with metadata:                             │
│ {                                                             │
│   id: "uuid",                                                 │
│   vector: [768 numbers],                                      │
│   payload: { filename, content, type, uploadDate }           │
│ }                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SEARCH QUERY                                              │
├─────────────────────────────────────────────────────────────┤
│ User Query: "mobile developers"                              │
│   ↓                                                           │
│ Convert to embedding: [768D vector]                          │
│   ↓                                                           │
│ Qdrant cosine similarity search                              │
│   ↓                                                           │
│ Return top 5 most similar CVs                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RESULTS                                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. iOS Engineer (0.89)                                       │
│ 2. Android Developer (0.87)                                  │
│ 3. React Native Dev (0.85)                                   │
│ 4. Flutter Engineer (0.84)                                   │
│ 5. Backend Dev (0.52)                                        │
└─────────────────────────────────────────────────────────────┘
```

## Code Components

### 1. Embedding Generation
```typescript
// src/lib/ollama-embeddings.ts
async function generateOllamaEmbedding(text: string): Promise<number[]> {
  const response = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.data.embedding; // [768 numbers]
}
```

### 2. Vector Storage
```typescript
// Upload CV to Qdrant
await qdrantClient.upsert(COLLECTION_NAME, {
  points: [{
    id: uuid(),
    vector: embedding, // 768D vector
    payload: { filename, content, type: 'cv' }
  }]
});
```

### 3. Semantic Search
```typescript
// Search for similar CVs
const queryEmbedding = await generateOllamaEmbedding("mobile developers");
const results = await qdrantClient.search(COLLECTION_NAME, {
  vector: queryEmbedding,
  limit: 5,
  with_payload: true,
});
```

## Key Advantages

1. **Language-agnostic**: Works across English, Spanish, French, German
2. **No keyword engineering**: No need to maintain synonym lists
3. **Context-aware**: Understands "iOS engineer" means mobile developer
4. **Robust**: Handles typos, variations, and indirect descriptions
5. **Scalable**: Sub-second searches across millions of documents

## Limitations

1. **Computing cost**: Generating embeddings requires GPU/CPU resources
2. **Cold start**: Need to pre-compute embeddings for all documents
3. **Opaque**: Hard to explain exactly why a match was made
4. **Model dependency**: Quality depends on embedding model training

## Summary

**Traditional Search (Keyword)**:
```
Query: "mobile developers"
Match: exact text match
Result: ❌ No results (word "mobile" not in CVs)
```

**Semantic Search (Vector)**:
```
Query: "mobile developers"
Embedding: [0.245, -0.556, ...]
Similarity: Compare with all CV embeddings
Result: ✓ iOS, Android, React Native, Flutter CVs (0.85-0.89 similarity)
```

**The Magic**: Embeddings encode *meaning*, not just *words*! 🧠✨

This is why semantic search can find "mobile developers" even when CVs only mention "iOS", "Android", "Swift", "Kotlin" - the vector space captures the relationship between these concepts.