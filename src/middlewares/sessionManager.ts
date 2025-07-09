import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import session from 'express-session';
import { SessionData } from '../utils/types';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    chatHistory: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: number;
      type?: 'text' | 'image';
      imageUrl?: string;
    }>;
  }
}

/**
 * Session management middleware
 * Handles session creation and management
 */
export const sessionManager = session({
  secret: process.env.SESSION_SECRET || 'forex_advisor_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  }
});

/**
 * Utility function to get or create session data
 * This can be used by controllers to easily access session data
 */
export const getOrCreateSession = (req: Request): string => {
  if (!req.session.userId) {
    req.session.userId = uuidv4();
    req.session.chatHistory = [];
  }
  return req.session.userId;
};

/**
 * Utility function to add message to chat history
 */
export const addMessageToSession = (req: Request, message: SessionData['chatHistory'][0]): void => {
  if (!req.session.chatHistory) {
    req.session.chatHistory = [];
  }
  req.session.chatHistory.push(message);
  
  // Limit history to last 50 messages
  if (req.session.chatHistory.length > 50) {
    req.session.chatHistory = req.session.chatHistory.slice(-50);
  }
};

/**
 * Utility function to get chat history
 */
export const getSessionChatHistory = (req: Request): SessionData['chatHistory'] => {
  return req.session.chatHistory || [];
};

/**
 * Utility function to clear chat history
 */
export const clearSessionChatHistory = (req: Request): void => {
  req.session.chatHistory = [];
};