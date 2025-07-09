import { Router } from 'express';
import { KnowledgeController } from '../controllers/KnowledgeController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const knowledgeController = new KnowledgeController();

// Public routes
router.get('/documents', knowledgeController.getAllDocuments);
router.get('/documents/:id', knowledgeController.getDocumentById);
router.get('/search', knowledgeController.searchDocuments);
router.post('/answer', knowledgeController.getEnhancedAnswer);
router.get('/categories', knowledgeController.getCategories);
router.get('/tags', knowledgeController.getAllTags);
router.get('/category/:category', knowledgeController.getDocumentsByCategory);
router.get('/tag/:tag', knowledgeController.getDocumentsByTag);

// Protected routes - admin only
router.post('/documents', authenticate, knowledgeController.addDocument);
router.put('/documents/:id', authenticate, knowledgeController.updateDocument);
router.delete('/documents/:id', authenticate, knowledgeController.deleteDocument);

export default router;