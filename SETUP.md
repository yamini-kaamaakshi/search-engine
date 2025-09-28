# Local AI Search Engine Setup Guide

This project implements a local search engine using:
- **Ollama** for local LLM inference
- **Simple text similarity** for document matching
- **Next.js** for the web interface

## Prerequisites

### 1. Install Ollama

First, install Ollama on your system:

```bash
# macOS
brew install ollama

# Or download from https://ollama.ai
```

Start Ollama service:
```bash
ollama serve
```

Pull a model (we recommend llama3.2:3b for good performance):
```bash
ollama pull llama3.2:3b
```

Verify Ollama is running:
```bash
curl http://localhost:11434/api/version
```

### 2. Setup Complete!

**Note**: For simplicity, this version uses an in-memory search approach. The Q&A data is loaded directly from the JSON file without requiring a separate vector database setup.

## Project Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

The project uses the following environment variables (already configured in `.env.local`):

```env
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### 3. Start the Development Server

**No data ingestion required!** The search engine loads Q&A data directly from the JSON file.

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
search-engine/
├── data/
│   └── qa-data.json          # Sample Q&A data for indexing
├── scripts/
│   └── ingest-data.ts        # Data ingestion script
├── src/
│   ├── app/
│   │   ├── api/search/
│   │   │   └── route.ts      # Search API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main search interface
│   └── lib/
│       ├── llamaindex.ts     # LlamaIndex configuration
│       └── qdrant.ts         # Qdrant client setup
├── .env.local                # Environment variables
└── package.json
```

## Usage

1. **Start Ollama**: Ensure Ollama is running
2. **Search**: Open the web interface and ask questions about machine learning

### Sample Queries

Try these example queries:
- "What is machine learning?"
- "How do neural networks work?"
- "What is the difference between supervised and unsupervised learning?"
- "What is overfitting?"

## Adding New Data

To add new Q&A pairs, simply edit `data/qa-data.json` and add your Q&A objects:
```json
{
  "id": "11",
  "question": "Your question here",
  "answer": "Your answer here"
}
```

The changes will be automatically picked up when you restart the development server.

## Troubleshooting

### Common Issues

1. **Ollama Connection Error**
   - Ensure Ollama is running: `ollama serve`
   - Check if the model is available: `ollama list`
   - Verify the model name in `.env.local`

2. **Search Not Working**
   - Check browser console for API errors
   - Verify the search API endpoint: `curl http://localhost:3000/api/search`
   - Ensure the Q&A data file exists: `data/qa-data.json`

### Logs and Debugging

- Check Ollama logs: Look at the terminal where `ollama serve` is running
- Check Next.js logs: Look at the terminal where `npm run dev` is running

## Performance Notes

- **Model Selection**: `llama3.2:3b` provides good performance. For better quality, try `llama3.1:8b` or `llama3.1:70b` (requires more resources)
- **Search Algorithm**: Uses simple text similarity matching for fast results
- **Search Results**: Returns top 3 most relevant results by default

## Customization

### Change the LLM Model

1. Pull a different model:
```bash
ollama pull llama3.1:8b
```

2. Update `.env.local`:
```env
OLLAMA_MODEL=llama3.1:8b
```

### Modify Search Parameters

Edit `src/lib/simple-search.ts` to change:
- Search result limit (default: 3)
- Text similarity calculation method

### Customize the UI

The search interface is in `src/app/page.tsx` and uses Tailwind CSS for styling.

## Security Notes

- This setup runs entirely locally - no data is sent to external APIs
- All Q&A data and processing happens on your machine
- Complete privacy and data control

## Next Steps

- Add more diverse Q&A data
- Implement user authentication
- Add conversation history
- Support for file uploads (PDFs, documents)
- Implement different search modes (semantic, keyword, hybrid)