import { Request, Response, NextFunction } from 'express';
import { ErrorDetail } from '../utils/types';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ErrorDetail,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  
  // Handle known error types
  if ('code' in err && err.code) {
    const status = getStatusCodeFromErrorCode(err.code);
    return res.status(status).json({
      error: {
        code: err.code,
        message: err.message,
        resolution: err.resolution || 'Please try again later'
      }
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      resolution: 'Please try again later'
    }
  });
};

/**
 * Maps error codes to HTTP status codes
 */
function getStatusCodeFromErrorCode(code: string): number {
  const codeMap: Record<string, number> = {
    'VALIDATION_ERROR': 400,
    'INVALID_REQUEST': 400,
    'INVALID_IMAGE': 400,
    'SESSION_NOT_FOUND': 404,
    'API_ERROR': 500,
    'RATE_LIMIT_EXCEEDED': 429,
    'OPENAI_API_ERROR': 502,
  };
  
  return codeMap[code] || 500;
}