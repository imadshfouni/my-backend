import { ErrorDetail } from './types';

/**
 * Validation error class
 */
export class ValidationError extends Error implements ErrorDetail {
  code = 'VALIDATION_ERROR';
  resolution = 'Please check your input and try again';
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Session error class
 */
export class SessionError extends Error implements ErrorDetail {
  code = 'SESSION_NOT_FOUND';
  resolution = 'Please start a new session';
  
  constructor(message = 'Session not found or expired') {
    super(message);
    this.name = 'SessionError';
  }
}

/**
 * API error class
 */
export class APIError extends Error implements ErrorDetail {
  code = 'API_ERROR';
  resolution = 'Please try again later';
  
  constructor(message = 'API request failed') {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * OpenAI API error class
 */
export class OpenAIError extends Error implements ErrorDetail {
  code = 'OPENAI_API_ERROR';
  resolution = 'Please check API configuration or try again later';
  
  constructor(message = 'OpenAI API request failed') {
    super(message);
    this.name = 'OpenAIError';
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error implements ErrorDetail {
  code = 'RATE_LIMIT_EXCEEDED';
  resolution = 'Please try again later';
  
  constructor(message = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Image processing error class
 */
export class ImageProcessingError extends Error implements ErrorDetail {
  code = 'INVALID_IMAGE';
  resolution = 'Please upload a valid forex chart image';
  
  constructor(message = 'Invalid image or processing failed') {
    super(message);
    this.name = 'ImageProcessingError';
  }
}