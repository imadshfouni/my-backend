import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import { JWTPayload } from '../utils/authTypes';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user payload to request object
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        resolution: 'Please provide a valid authentication token'
      });
      return;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        resolution: 'Please login again to get a new token'
      });
      return;
    }
    
    // Add user payload to request
    req.user = payload;
    
    next();
  } catch (error) {
    res.status(401).json({
      code: 'AUTH_ERROR',
      message: 'Authentication error',
      resolution: 'Please login again'
    });
  }
};

/**
 * Optional authentication middleware
 * Verifies JWT token if present, but does not require it
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
    
    next();
  } catch (error) {
    next();
  }
};