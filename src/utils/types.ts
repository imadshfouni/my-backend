/**
 * Error detail interface for standardized error handling
 */
export interface ErrorDetail extends Error {
  code: string;
  message: string;
  resolution?: string;
}

/**
 * Session data structure
 */
export interface SessionData {
  chatHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    type?: 'text' | 'image';
    imageUrl?: string;
  }>;
}

/**
 * Chat request structure
 */
export interface ChatRequest {
  message: string;
  sessionId: string;
}

/**
 * Chat response structure
 */
export interface ChatResponse {
  message: string;
  sessionId: string;
  timestamp: number;
}

/**
 * Image upload request structure
 */
export interface ImageUploadRequest {
  sessionId: string;
  prompt?: string;
  image: Express.Multer.File;
}

/**
 * Session information
 */
export interface SessionInfo {
  sessionId: string;
  created: number;
  messagesCount: number;
}