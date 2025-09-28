'use client';

import { useState, useEffect } from 'react';

interface SearchResult {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    content: string;
    type: 'qa' | 'file';
    source?: string;
    filename?: string;
    chunkIndex?: number;
    score: number;
  }>;
}

interface UploadedFile {
  id: string;
  filename: string;
  type: string;
  uploadDate: string;
  contentLength: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'upload'>('search');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Refresh the file list
      await loadUploadedFiles();

      // Reset the file input
      e.target.value = '';

    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const loadUploadedFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files?id=${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadUploadedFiles();
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  // Load files on component mount
  useEffect(() => {
    loadUploadedFiles();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              AI Search Engine
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Search across Q&A pairs and uploaded documents
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              📄 Upload Documents ({uploadedFiles.length})
            </button>
          </div>

          {/* Search Tab */}
          {activeTab === 'search' && (
            <>
              <form onSubmit={handleSearch} className="mb-8">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about machine learning or your uploaded documents..."
                    className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Upload Documents
                </h2>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt"
                    disabled={uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <div className="text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-4">📁</div>
                      <p className="text-lg font-medium mb-2">
                        {uploading ? 'Uploading...' : 'Click to upload a file'}
                      </p>
                      <p className="text-sm">
                        Supports PDF, DOCX, and TXT files (max 10MB)
                      </p>
                    </div>
                  </label>
                </div>

                {uploadError && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    {uploadError}
                  </div>
                )}
              </div>

              {/* Uploaded Files List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Uploaded Documents ({uploadedFiles.length})
                </h2>

                {uploadedFiles.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No documents uploaded yet. Upload some files to start searching through them!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {file.filename}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {file.type.toUpperCase()} • {file.contentLength} characters • {new Date(file.uploadDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Show error and results only on search tab */}
          {activeTab === 'search' && (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Answer
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {result.answer}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This search engine uses local models and vector database for privacy-focused AI search.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
