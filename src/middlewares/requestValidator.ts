import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

/**
 * Global request validator middleware
 * Validates required request parameters based on route
 */
export const requestValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // GET /api/session - no validation needed
    if (req.method === 'GET' && req.path === '/api/session') {
      return next();
    }
    
    // DELETE /api/session/:sessionId - validate session ID
    if (req.method === 'DELETE' && req.path.startsWith('/api/session/')) {
      const sessionId = req.params.sessionId;
      if (!sessionId || sessionId.trim() === '') {
        throw new ValidationError('Session ID is required');
      }
      return next();
    }
    
    // POST /api/chat - validate message content
    if (req.method === 'POST' && req.path === '/api/chat') {
      const { message, sessionId } = req.body;
      
      if (!sessionId || sessionId.trim() === '') {
        throw new ValidationError('Session ID is required');
      }
      
      if (!message || message.trim() === '') {
        throw new ValidationError('Message content is required');
      }
      
      return next();
    }
    
    // POST /api/upload - validation handled by multer middleware
    if (req.method === 'POST' && req.path === '/api/upload') {
      // File validation is handled by multer
      // Just check if session ID is provided
      const sessionId = req.body.sessionId;
      
      if (!sessionId || sessionId.trim() === '') {
        throw new ValidationError('Session ID is required');
      }
      
      return next();
    }
    
    // For any other routes, proceed without validation
    return next();
  } catch (error) {
    next(error);
  }
};