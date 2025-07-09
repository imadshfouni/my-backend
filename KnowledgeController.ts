import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { KnowledgeService, KnowledgeDocument } from '../services/KnowledgeService';

export class KnowledgeController {
  private knowledgeService: KnowledgeService;
  
  constructor() {
    this.knowledgeService = KnowledgeService.getInstance();
  }
  
  /**
   * Get all documents
   */
  public getAllDocuments = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const documents = this.knowledgeService.getAllDocuments();
      res.json({ documents, count: documents.length });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get document by ID
   */
  public getDocumentById = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ValidationError('Document ID is required');
      }
      
      const document = this.knowledgeService.getDocumentById(id);
      
      if (!document) {
        throw new ValidationError(`Document with ID ${id} not found`);
      }
      
      res.json(document);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Search documents
   */
  public searchDocuments = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { query, limit } = req.query;
      
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Search query is required');
      }
      
      const limitNum = limit ? parseInt(limit as string) : 5;
      const results = this.knowledgeService.searchDocuments(query, limitNum);
      
      res.json({
        results,
        count: results.length,
        query
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Add new document
   */
  public addDocument = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { title, content, category, tags, source } = req.body;
      
      // Validation
      if (!title) throw new ValidationError('Title is required');
      if (!content) throw new ValidationError('Content is required');
      if (!category) throw new ValidationError('Category is required');
      if (!tags || !Array.isArray(tags)) throw new ValidationError('Tags array is required');
      
      const newDocument = this.knowledgeService.addDocument({
        title,
        content,
        category,
        tags,
        source
      });
      
      res.status(201).json(newDocument);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update document
   */
  public updateDocument = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      const { title, content, category, tags, source } = req.body;
      
      if (!id) {
        throw new ValidationError('Document ID is required');
      }
      
      // Create updates object with only provided fields
      const updates: Partial<Omit<KnowledgeDocument, 'id'>> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (category !== undefined) updates.category = category;
      if (tags !== undefined) {
        if (!Array.isArray(tags)) throw new ValidationError('Tags must be an array');
        updates.tags = tags;
      }
      if (source !== undefined) updates.source = source;
      
      const updatedDocument = this.knowledgeService.updateDocument(id, updates);
      
      if (!updatedDocument) {
        throw new ValidationError(`Document with ID ${id} not found`);
      }
      
      res.json(updatedDocument);
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete document
   */
  public deleteDocument = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ValidationError('Document ID is required');
      }
      
      const isDeleted = this.knowledgeService.deleteDocument(id);
      
      if (!isDeleted) {
        throw new ValidationError(`Document with ID ${id} not found`);
      }
      
      res.json({
        success: true,
        message: `Document ${id} deleted successfully`
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get enhanced answer
   */
  public getEnhancedAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Query is required');
      }
      
      const answer = await this.knowledgeService.getEnhancedAnswer(query);
      
      res.json({
        query,
        answer,
        timestamp: Date.now()
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get all categories
   */
  public getCategories = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const categories = this.knowledgeService.getCategories();
      res.json({ categories, count: categories.length });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get all tags
   */
  public getAllTags = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const tags = this.knowledgeService.getAllTags();
      res.json({ tags, count: tags.length });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get documents by category
   */
  public getDocumentsByCategory = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { category } = req.params;
      
      if (!category) {
        throw new ValidationError('Category is required');
      }
      
      const documents = this.knowledgeService.getDocumentsByCategory(category);
      
      res.json({
        category,
        documents,
        count: documents.length
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get documents by tag
   */
  public getDocumentsByTag = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { tag } = req.params;
      
      if (!tag) {
        throw new ValidationError('Tag is required');
      }
      
      const documents = this.knowledgeService.getDocumentsByTag(tag);
      
      res.json({
        tag,
        documents,
        count: documents.length
      });
    } catch (error) {
      next(error);
    }
  };
}