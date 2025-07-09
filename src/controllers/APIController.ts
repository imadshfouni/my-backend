import { Request, Response, NextFunction } from 'express';
import OpenAI from 'openai';
import { 
  ChatRequest, 
  ChatResponse, 
  ImageUploadRequest, 
  SessionInfo 
} from '../utils/types';
import { 
  OpenAIError, 
  ValidationError, 
  SessionError 
} from '../utils/errors';
import { 
  getOrCreateSession, 
  addMessageToSession, 
  getSessionChatHistory, 
  clearSessionChatHistory 
} from '../middlewares/sessionManager';
import path from 'path';
import fs from 'fs';

export class APIController {
  private openai: OpenAI;
  
  constructor() {
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('OpenAI API key not found. Set OPENAI_API_KEY in .env file');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key-for-development'
    });
  }
  
  /**
   * Handle chat request
   */
  public handleChatRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, sessionId } = req.body as ChatRequest;
      
      // Check session
      if (sessionId !== req.session.userId) {
        throw new SessionError();
      }
      
      // Add user message to session
      addMessageToSession(req, {
        role: 'user',
        content: message,
        timestamp: Date.now(),
        type: 'text'
      });
      
      // Get chat history
      const chatHistory = getSessionChatHistory(req);
      
      // Prepare message context for OpenAI
      const messages = [
        {
          role: 'system',
          content: `You are ForexAdvisor, an expert forex trading assistant. 
          Provide professional, data-driven trading advice for forex market analysis.
          Focus on technical indicators, market trends, and risk management.
          Be concise, precise and professional.
          Avoid discussing topics unrelated to forex trading.`
        } as OpenAI.ChatCompletionMessageParam
      ];
      
      // Add chat history (convert to OpenAI format)
      chatHistory.forEach(msg => {
        // Skip image messages for text-based chat
        if (msg.type === 'image') return;
        
        messages.push({
          role: msg.role,
          content: msg.content
        } as OpenAI.ChatCompletionMessageParam);
      });
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4", // Or an appropriate model
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract response
      const aiMessage = completion.choices[0].message.content || 'No advice available at the moment.';
      
      // Add assistant message to session
      addMessageToSession(req, {
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
        type: 'text'
      });
      
      // Send response
      const response: ChatResponse = {
        message: aiMessage,
        sessionId,
        timestamp: Date.now()
      };
      
      res.json(response);
    } catch (error) {
      // Check for OpenAI API errors
      if (error instanceof Error && 'status' in error) {
        next(new OpenAIError(error.message));
      } else {
        next(error);
      }
    }
  };
  
  /**
   * Handle image upload and analysis
   */
  public handleImageUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, prompt } = req.body;
      const file = req.file;
      
      // Check session
      if (sessionId !== req.session.userId) {
        throw new SessionError();
      }
      
      // Check if file was uploaded
      if (!file) {
        throw new ValidationError('No image file uploaded');
      }
      
      // Generate image URL for frontend
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      const imageUrl = `${baseUrl}/${uploadDir}/${path.basename(file.path)}`;
      
      // Add user message to session
      addMessageToSession(req, {
        role: 'user',
        content: prompt || 'Please analyze this forex chart.',
        timestamp: Date.now(),
        type: 'image',
        imageUrl
      });
      
      // Prepare message context for OpenAI
      const messages = [
        {
          role: 'system',
          content: `You are ForexAdvisor, an expert forex trading assistant analyzing chart images. 
          Provide professional, detailed analysis based on the forex chart image.
          Focus on identifying patterns, support/resistance levels, indicators, and clear trading recommendations.
          Be concise, precise and professional.
          If the image is not a forex chart, kindly inform the user that you can only analyze forex charts.`
        } as OpenAI.ChatCompletionMessageParam
      ];
      
      // Add the prompt and image to the messages
      const imagePath = file.path;
      const imageData = fs.readFileSync(imagePath);
      const base64Image = Buffer.from(imageData).toString('base64');
      const mimeType = file.mimetype;
      
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt || 'Please analyze this forex chart.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      } as OpenAI.ChatCompletionMessageParam);
      
      // Call OpenAI API with image
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview", // Model that can process images
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Extract response
      const aiMessage = completion.choices[0].message.content || 'No analysis available at the moment.';
      
      // Add assistant message to session
      addMessageToSession(req, {
        role: 'assistant',
        content: aiMessage,
        timestamp: Date.now(),
        type: 'text'
      });
      
      // Send response
      const response: ChatResponse = {
        message: aiMessage,
        sessionId,
        timestamp: Date.now()
      };
      
      res.json(response);
    } catch (error) {
      // Check for OpenAI API errors
      if (error instanceof Error && 'status' in error) {
        next(new OpenAIError(error.message));
      } else {
        next(error);
      }
    }
  };
  
  /**
   * Get or create session
   */
  public getSession = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const sessionId = getOrCreateSession(req);
      const chatHistory = getSessionChatHistory(req);
      
      const sessionInfo: SessionInfo = {
        sessionId,
        created: req.session.cookie.expires?.getTime() || Date.now(),
        messagesCount: chatHistory.length
      };
      
      res.json(sessionInfo);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Clear session chat history
   */
  public clearSession = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { sessionId } = req.params;
      
      // Check session
      if (sessionId !== req.session.userId) {
        throw new SessionError();
      }
      
      clearSessionChatHistory(req);
      
      res.json({ 
        success: true, 
        message: 'Chat history cleared',
        sessionId
      });
    } catch (error) {
      next(error);
    }
  };
}