import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from './embeddings';
import { storeDocumentInQdrant, deleteDocumentFromQdrant, getAllDocumentsFromQdrant, initializeCollection, type StoredDocument } from './qdrant';

export interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'unknown';
  uploadDate: string;
}

export interface FileProcessingResult {
  success: boolean;
  document?: ProcessedDocument;
  error?: string;
}

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Qdrant collection on module load
initializeCollection().catch(console.error);

export async function processFile(filePath: string, originalName: string): Promise<FileProcessingResult> {
  try {
    const fileExtension = path.extname(originalName).toLowerCase();
    const fileId = generateFileId();
    const uploadDate = new Date().toISOString();

    let content: string;
    let type: ProcessedDocument['type'];

    switch (fileExtension) {
      case '.pdf':
        content = await processPDF(filePath);
        type = 'pdf';
        break;
      case '.docx':
        content = await processDOCX(filePath);
        type = 'docx';
        break;
      case '.txt':
        content = await processTXT(filePath);
        type = 'txt';
        break;
      default:
        return {
          success: false,
          error: `Unsupported file type: ${fileExtension}. Supported types: .pdf, .docx, .txt`
        };
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: 'No text content could be extracted from the file'
      };
    }

    const document: ProcessedDocument = {
      id: fileId,
      filename: originalName,
      content: content.trim(),
      type,
      uploadDate
    };

    // Split document into chunks for better search
    const chunks = splitDocumentIntoChunks(document);

    // Store each chunk in Qdrant with embeddings
    for (const chunk of chunks) {
      const storedDoc: StoredDocument = {
        id: chunk.id,
        filename: chunk.filename,
        content: chunk.content,
        type: chunk.type as 'pdf' | 'docx' | 'txt' | 'qa',
        uploadDate: chunk.uploadDate,
        chunkIndex: chunk.chunkIndex,
        parentDocumentId: document.id
      };

      // Generate embedding for the chunk
      const embedding = await generateEmbedding(chunk.content);

      // Store in Qdrant
      await storeDocumentInQdrant(storedDoc, embedding);
    }

    // Clean up the temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      document
    };

  } catch (error) {
    console.error('Error processing file:', error);
    return {
      success: false,
      error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function processPDF(filePath: string): Promise<string> {
  try {
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is empty');
    }

    console.log(`Processing PDF: ${filePath}, size: ${stats.size} bytes`);

    const pdfParse = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);

    // Additional options for pdf-parse to handle more PDF types
    const options = {
      // Disable OCR and other complex features for better compatibility
      max: 0, // No page limit
    };

    const data = await pdfParse.default(dataBuffer, options);

    console.log(`PDF processed successfully. Extracted ${data.text.length} characters`);
    console.log(`PDF info: ${data.numpages} pages, ${data.numrender} rendered`);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content found in PDF. The PDF might be image-based or encrypted.');
    }

    return data.text.trim();
  } catch (error) {
    console.error('PDF processing error details:', error);

    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('Invalid PDF')) {
        throw new Error('Invalid PDF format. Please ensure the file is a valid PDF.');
      } else if (error.message.includes('encrypted') || error.message.includes('password')) {
        throw new Error('PDF is password-protected. Please upload an unprotected PDF.');
      } else if (error.message.includes('No text content')) {
        throw new Error('PDF contains no extractable text. It might be a scanned document.');
      } else {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    } else {
      throw new Error('Failed to extract text from PDF. Unknown error occurred.');
    }
  }
}

async function processDOCX(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function processTXT(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function getUploadedDocuments(): Promise<ProcessedDocument[]> {
  try {
    const points = await getAllDocumentsFromQdrant();
    const documentsMap = new Map<string, ProcessedDocument>();

    // Group chunks back into documents
    for (const point of points) {
      const payload = point.payload as unknown as StoredDocument;
      const parentId = payload.parentDocumentId || payload.id;

      if (!documentsMap.has(parentId)) {
        documentsMap.set(parentId, {
          id: parentId,
          filename: payload.filename,
          content: payload.content,
          type: payload.type as 'pdf' | 'docx' | 'txt' | 'unknown',
          uploadDate: payload.uploadDate
        });
      } else {
        // Append chunk content to existing document
        const doc = documentsMap.get(parentId)!;
        doc.content += ' ' + payload.content;
      }
    }

    return Array.from(documentsMap.values());
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export async function deleteDocument(fileId: string): Promise<boolean> {
  try {
    // Get all chunks for this document
    const points = await getAllDocumentsFromQdrant();
    const chunksToDelete = points.filter(point => {
      const payload = point.payload as unknown as StoredDocument;
      return payload.parentDocumentId === fileId;
    });

    // Delete all chunks
    for (const chunk of chunksToDelete) {
      await deleteDocumentFromQdrant(chunk.id.toString());
    }

    return chunksToDelete.length > 0;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

export async function getDocumentById(fileId: string): Promise<ProcessedDocument | undefined> {
  try {
    const points = await getAllDocumentsFromQdrant();
    const chunks = points.filter(point => {
      const payload = point.payload as unknown as StoredDocument;
      return payload.parentDocumentId === fileId;
    });

    if (chunks.length === 0) return undefined;

    // Sort chunks by index and combine content
    chunks.sort((a, b) => {
      const aPayload = a.payload as StoredDocument;
      const bPayload = b.payload as StoredDocument;
      return (aPayload.chunkIndex || 0) - (bPayload.chunkIndex || 0);
    });

    const firstChunk = chunks[0].payload as StoredDocument;
    const combinedContent = chunks.map(chunk => (chunk.payload as StoredDocument).content).join(' ');

    return {
      id: fileId,
      filename: firstChunk.filename,
      content: combinedContent,
      type: firstChunk.type as 'pdf' | 'docx' | 'txt' | 'unknown',
      uploadDate: firstChunk.uploadDate
    };
  } catch (error) {
    console.error('Error fetching document:', error);
    return undefined;
  }
}

// Split document content into chunks for better search
export function splitDocumentIntoChunks(document: ProcessedDocument, chunkSize: number = 500): Array<{
  id: string;
  filename: string;
  content: string;
  type: string;
  uploadDate: string;
  chunkIndex: number;
}> {
  const words = document.content.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkContent = chunkWords.join(' ');

    if (chunkContent.trim().length > 0) {
      chunks.push({
        id: uuidv4(),
        filename: document.filename,
        content: chunkContent,
        type: document.type,
        uploadDate: document.uploadDate,
        chunkIndex: Math.floor(i / chunkSize)
      });
    }
  }

  return chunks;
}