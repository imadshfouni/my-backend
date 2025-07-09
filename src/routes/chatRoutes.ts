import { Router } from 'express';
import { APIController } from '../controllers/APIController';

const router = Router();
const apiController = new APIController();

/**
 * @route POST /api/chat
 * @description Send a message to the chat API
 * @body {string} message - User message
 * @body {string} sessionId - User session ID
 * @returns {object} AI response
 */
router.post('/', apiController.handleChatRequest);

export default router;