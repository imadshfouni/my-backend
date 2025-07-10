import { Request } from 'express';
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
    systemChoice?: string;
  }
}

export const sessionManager = session({
  secret: process.env.SESSION_SECRET || 'forex_advisor_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,           // ✅ assuming your site is HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
});

export const getOrCreateSession = (req: Request): string => {
  if (!req.session.userId) {
    req.session.userId = uuidv4();
    req.session.chatHistory = [];
  }
  return req.session.userId;
};

export const addMessageToSession = (req: Request, message: SessionData['chatHistory'][0]): void => {
  if (!req.session.chatHistory) {
    req.session.chatHistory = [];
  }
  req.session.chatHistory.push(message);

  if (req.session.chatHistory.length > 50) {
    req.session.chatHistory = req.session.chatHistory.slice(-50);
  }
};

export const getSessionChatHistory = (req: Request): SessionData['chatHistory'] => {
  return req.session.chatHistory || [];
};

export const clearSessionChatHistory = (req: Request): void => {
  req.session.chatHistory = [];
};
