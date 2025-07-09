import { Router } from 'express';
import chatRoutes from './chatRoutes';
import uploadRoutes from './uploadRoutes';
import sessionRoutes from './sessionRoutes';
import authRoutes from './authRoutes';
import forexRoutes from './forexRoutes';
import knowledgeRoutes from './knowledgeRoutes';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Mount route handlers
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/session', sessionRoutes);
router.use('/auth', authRoutes);
router.use('/forex', forexRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/analytics', analyticsRoutes);

export default router;