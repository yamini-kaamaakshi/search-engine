import { NextRequest, NextResponse } from 'next/server';
import { getUploadedDocuments, deleteDocument } from '../../../lib/file-processor';

export async function GET() {
  try {
    const documents = await getUploadedDocuments();
    return NextResponse.json({
      files: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        type: doc.type,
        uploadDate: doc.uploadDate,
        contentLength: doc.content.length
      }))
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const success = await deleteDocument(fileId);

    if (!success) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}