# Local AI Search Engine with File Upload

This project implements a local search engine using:
- **Ollama** for local LLM inference
- **File Upload Support** for PDF, DOCX, and TXT documents
- **Simple text similarity** for document matching across Q&A pairs and uploaded files
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
│   └── qa-data.json          # Sample Q&A data
├── uploads/                  # Temporary file upload directory (auto-created)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── search/
│   │   │   │   └── route.ts  # Search API endpoint
│   │   │   ├── upload/
│   │   │   │   └── route.ts  # File upload API endpoint
│   │   │   └── files/
│   │   │       └── route.ts  # File management API endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main search interface with upload tabs
│   └── lib/
│       ├── simple-search.ts  # Search logic for Q&A and files
│       ├── file-processor.ts # File processing utilities
│       ├── embeddings.ts     # Embedding generation utilities
│       └── qdrant.ts         # Qdrant client setup
├── .env.local                # Environment variables
└── package.json
```

## Usage

The search engine has two main tabs:

### 1. Search Tab
- Search across Q&A pairs and uploaded documents
- Ask questions and get AI-generated answers with source citations
- Results show both Q&A pairs and document chunks with relevance scores

### 2. Upload Documents Tab
- Upload PDF, DOCX, and TXT files (max 10MB each)
- Files are automatically processed and split into searchable chunks
- Manage uploaded files (view list, delete files)

### Sample Workflows

**Using Pre-loaded Q&A Data:**
- "What is machine learning?"
- "How do neural networks work?"
- "What is the difference between supervised and unsupervised learning?"
- "What is overfitting?"

**Using Uploaded Documents:**
1. Upload a PDF research paper or documentation file
2. Ask questions about the content: "What are the main conclusions?" or "Summarize the methodology"
3. Get answers with citations to specific parts of your document

## Adding New Data

### Q&A Pairs
To add new Q&A pairs, simply edit `data/qa-data.json` and add your Q&A objects:
```json
{
  "id": "11",
  "question": "Your question here",
  "answer": "Your answer here"
}
```

The changes will be automatically picked up when you restart the development server.

### Document Upload
Use the Upload Documents tab in the web interface to add new files:

**Supported File Types:**
- **PDF**: Research papers, documentation, reports
- **DOCX**: Microsoft Word documents
- **TXT**: Plain text files

**Features:**
- Automatic text extraction and processing
- Document chunking for better search results
- File management (view, delete)
- No external API calls - all processing happens locally

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

3. **File Upload Issues**
   - **File too large**: Maximum file size is 10MB
   - **Unsupported file type**: Only PDF, DOCX, and TXT files are supported
   - **Upload fails**: Check Next.js logs for detailed error messages
   - **No text extracted**: Some PDFs may have images or be protected - try converting to text first

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
- Implement vector embeddings for better semantic search
- Add support for more file types (Excel, PowerPoint, etc.)
- Implement different search modes (semantic, keyword, hybrid)
- Add file persistence between sessions