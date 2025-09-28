'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface UploadedFile {
  id: string;
  filename: string;
  type: string;
  uploadDate: string;
  contentLength: number;
}

// Utility classes
const gradients = {
  main: "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-blue-900 dark:to-purple-900",
  sidebar: "bg-gradient-to-b from-white via-blue-50 to-purple-50 dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-800 dark:to-blue-900",
  button: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
  userMessage: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg",
  assistantMessage: "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-100 shadow-md",
  input: "bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-600",
  send: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
  title: "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent",
  activeChat: "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-blue-900",
  hoverChat: "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-gray-700",
  dropdown: "bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-blue-900"
};

// Spinner Component
const Spinner = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Icon Components
const PlusIcon = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const AttachIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

// Message Component
const MessageBubble = ({ message }: { message: Message }) => (
  <div className={`py-2 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] ${message.role === 'user' ? gradients.userMessage : gradients.assistantMessage} rounded-2xl px-4 py-3`}>
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {message.content}
      </p>
    </div>
  </div>
);

// Loading Component
const LoadingIndicator = () => (
  <div className="px-4 py-8">
    <div className="flex space-x-3">
      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-sm flex items-center justify-center">
        <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex space-x-1 items-center">
        {[0, 150, 300].map((delay, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full animate-bounce ${
              i === 0 ? 'bg-gradient-to-r from-blue-400 to-purple-500' :
              i === 1 ? 'bg-gradient-to-r from-purple-400 to-pink-500' :
              'bg-gradient-to-r from-pink-400 to-red-500'
            }`}
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// File Item Component
const FileItem = ({ file, onDelete }: { file: UploadedFile, onDelete: (id: string, name: string) => void }) => {
  const getFileColor = (type: string) =>
    type === 'pdf' ? 'bg-gradient-to-r from-red-400 to-pink-500' :
    type === 'docx' ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
    'bg-gradient-to-r from-green-400 to-emerald-500';

  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getFileColor(file.type)}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.filename}>
            {file.filename}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {file.type.toUpperCase()} • {file.contentLength.toLocaleString()} chars
          </p>
        </div>
      </div>
      <button
        onClick={() => onDelete(file.id, file.filename)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6m0 0l6 6m-6-6v12" />
        </svg>
      </button>
    </div>
  );
};

// Search Input Component
const SearchInput = ({
  inputValue,
  loading,
  uploading,
  uploadedFiles,
  textareaRef,
  fileInputRef,
  onTextareaChange,
  onKeyDown,
  onSubmit,
  onFileUpload
}: {
  inputValue: string;
  loading: boolean;
  uploading: boolean;
  uploadedFiles: UploadedFile[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <form onSubmit={onSubmit}>
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={onTextareaChange}
        onKeyDown={onKeyDown}
        placeholder={uploadedFiles.length > 0 ? "Message AI Search Assistant..." : "Upload documents first to start asking questions..."}
        className={`w-full px-4 py-3 pr-20 ${gradients.input} border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-sm`}
        style={{ minHeight: '52px', maxHeight: '200px' }}
        disabled={loading}
      />
      <div className="absolute right-2 bottom-2 flex items-center space-x-1">
        <input type="file" ref={fileInputRef} onChange={onFileUpload} accept=".pdf,.docx,.txt" disabled={uploading} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Upload document">
          {uploading ? <Spinner /> : <AttachIcon />}
        </button>
        <button type="submit" disabled={loading || !inputValue.trim() || uploadedFiles.length === 0} className={`p-2 ${gradients.send} text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg`}>
          {loading ? <Spinner /> : <SendIcon />}
        </button>
      </div>
    </div>
    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">Press Enter to send, Shift + Enter for new line</div>
  </form>
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Utility functions
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const generateChatTitle = (messages: Message[]) => {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    return firstUserMessage ? firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') : 'New Chat';
  };
  const formatChatDate = (date: Date) => {
    const diffInHours = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return 'Today';
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  // Effects
  useEffect(scrollToBottom, [messages]);
  useEffect(() => { loadUploadedFiles(); loadChatSessions(); }, []);
  useEffect(() => { if (chatSessions.length > 0) localStorage.setItem('chatSessions', JSON.stringify(chatSessions)); }, [chatSessions]);
  useEffect(() => { if (messages.length > 0 && currentChatId) saveChatSession(); }, [messages, currentChatId]);

  // API functions
  const loadChatSessions = () => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }))
        }));
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const saveChatSession = () => {
    if (!currentChatId || messages.length === 0) return;
    setChatSessions(prev => {
      const existingIndex = prev.findIndex(session => session.id === currentChatId);
      const now = new Date();
      const updatedSession: ChatSession = {
        id: currentChatId,
        title: generateChatTitle(messages),
        messages: [...messages],
        createdAt: existingIndex >= 0 ? prev[existingIndex].createdAt : now,
        updatedAt: now
      };
      return existingIndex >= 0
        ? [...prev.slice(0, existingIndex), updatedSession, ...prev.slice(existingIndex + 1)].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        : [updatedSession, ...prev].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    });
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

  const addMessage = (content: string, role: 'user' | 'assistant', sources?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      sources
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading || uploadedFiles.length === 0) return;

    if (!currentChatId) {
      setCurrentChatId(`chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
    }

    addMessage(inputValue.trim(), 'user');
    setInputValue('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputValue.trim() }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      addMessage(data.answer, 'assistant', data.sources);
    } catch (err) {
      addMessage('Sorry, I encountered an error while searching. Please try again.', 'assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      await loadUploadedFiles();
      e.target.value = '';
      addMessage(`Successfully uploaded "${file.name}". You can now ask questions about this document.`, 'assistant');
    } catch (err) {
      addMessage(`Failed to upload file: ${err instanceof Error ? err.message : 'Unknown error'}`, 'assistant');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files?id=${fileId}`, { method: 'DELETE' });
      if (response.ok) {
        await loadUploadedFiles();
        addMessage(`Deleted "${filename}" successfully.`, 'assistant');
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const loadChatSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentChatId(session.id);
    setShowSidebar(false);
  };

  const deleteChatSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentChatId === sessionId) startNewChat();
    const updatedSessions = chatSessions.filter(session => session.id !== sessionId);
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
  };

  return (
    <div className={`flex h-screen ${gradients.main}`}>
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 ${gradients.sidebar} border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 lg:relative lg:translate-x-0 backdrop-blur-sm`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <button onClick={startNewChat} className={`flex-1 flex items-center space-x-3 px-3 py-2 ${gradients.button} text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg`}>
              <PlusIcon />
              <span className="text-white font-medium">New chat</span>
            </button>
            <button onClick={() => setShowSidebar(false)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-2">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {chatSessions.length > 0 ? (
                <>
                  <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Recent Chats</h3>
                  {chatSessions.map((session) => (
                    <div key={session.id} className={`group relative flex items-center p-3 rounded-lg transition-colors cursor-pointer ${currentChatId === session.id ? `${gradients.activeChat} text-blue-700 dark:text-white border border-blue-200 dark:border-purple-700 shadow-md` : `text-gray-700 dark:text-gray-300 ${gradients.hoverChat}`}`} onClick={() => loadChatSession(session)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatChatDate(session.updatedAt)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteChatSession(session.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all ml-2" title="Delete chat">
                        <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-500">No chat history yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Start a conversation to see it here</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 relative">
            <button onClick={() => setShowFiles(!showFiles)} className="w-full flex items-center justify-between space-x-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" />
                <span>Local AI • {uploadedFiles.length} docs</span>
              </div>
              <svg className={`w-4 h-4 transform transition-transform ${showFiles ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFiles && (
              <div className={`absolute bottom-full left-4 right-4 mb-2 ${gradients.dropdown} border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl backdrop-blur-sm z-50 max-h-64 overflow-y-auto`}>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Uploaded Documents ({uploadedFiles.length})</h3>
                </div>
                {uploadedFiles.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No documents uploaded yet</div>
                ) : (
                  <div className="p-2">
                    {uploadedFiles.map((file) => <FileItem key={file.id} file={file} onDelete={deleteFile} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          /* Empty state with centered input */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-2xl mx-auto px-4 w-full">
              <h2 className={`text-4xl font-bold ${gradients.title} mb-8`}>How can I help you today?</h2>
              <SearchInput
                inputValue={inputValue}
                loading={loading}
                uploading={uploading}
                uploadedFiles={uploadedFiles}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                onTextareaChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onSubmit={handleSubmit}
                onFileUpload={handleFileUpload}
              />
            </div>
          </div>
        ) : (
          /* Chat messages with input at bottom */
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4">
                {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                {loading && <LoadingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="max-w-4xl mx-auto p-4 w-full">
              <SearchInput
                inputValue={inputValue}
                loading={loading}
                uploading={uploading}
                uploadedFiles={uploadedFiles}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                onTextareaChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onSubmit={handleSubmit}
                onFileUpload={handleFileUpload}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}