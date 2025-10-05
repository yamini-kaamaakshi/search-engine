import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateCohereEmbedding } from './cohere-service';
import {
  storeDocument,
  getAllDocuments,
  deleteDocumentsByParentId,
  getDocumentsByParentId,
  type StoredDocument
} from './document-store';

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

    // Store each chunk with Cohere embeddings
    for (const chunk of chunks) {
      // Generate embedding for the chunk using Cohere
      const embedding = await generateCohereEmbedding(chunk.content);

      const storedDoc: StoredDocument = {
        id: chunk.id,
        filename: chunk.filename,
        content: chunk.content,
        type: chunk.type as 'pdf' | 'docx' | 'txt' | 'qa',
        uploadDate: chunk.uploadDate,
        chunkIndex: chunk.chunkIndex,
        parentDocumentId: document.id,
        embedding: embedding
      };

      // Store in document store
      await storeDocument(storedDoc);
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
  try {
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      throw new Error('DOCX file not found');
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('DOCX file is empty');
    }

    console.log(`Processing DOCX: ${filePath}, size: ${stats.size} bytes`);

    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    console.log(`DOCX processed successfully. Extracted ${result.value.length} characters`);

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('No text content found in DOCX file');
    }

    return result.value.trim();
  } catch (error) {
    console.error('DOCX processing error details:', error);

    if (error instanceof Error) {
      if (error.message.includes('zip file')) {
        throw new Error('Invalid DOCX format. Please ensure the file is a valid DOCX document.');
      } else if (error.message.includes('No text content')) {
        throw new Error('DOCX contains no extractable text.');
      } else {
        throw new Error(`DOCX processing failed: ${error.message}`);
      }
    } else {
      throw new Error('Failed to extract text from DOCX. Unknown error occurred.');
    }
  }
}

async function processTXT(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function getUploadedDocuments(): Promise<ProcessedDocument[]> {
  try {
    const allDocs = await getAllDocuments();
    const documentsMap = new Map<string, ProcessedDocument>();

    // Group chunks back into documents
    for (const doc of allDocs) {
      const parentId = doc.parentDocumentId || doc.id;

      if (!documentsMap.has(parentId)) {
        documentsMap.set(parentId, {
          id: parentId,
          filename: doc.filename,
          content: doc.content,
          type: doc.type as 'pdf' | 'docx' | 'txt' | 'unknown',
          uploadDate: doc.uploadDate
        });
      } else {
        // Append chunk content to existing document
        const existingDoc = documentsMap.get(parentId)!;
        existingDoc.content += ' ' + doc.content;
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
    const deletedCount = await deleteDocumentsByParentId(fileId);
    return deletedCount > 0;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

export async function getDocumentById(fileId: string): Promise<ProcessedDocument | undefined> {
  try {
    const chunks = await getDocumentsByParentId(fileId);

    if (chunks.length === 0) return undefined;

    // Sort chunks by index and combine content
    chunks.sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

    const firstChunk = chunks[0];
    const combinedContent = chunks.map(chunk => chunk.content).join(' ');

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