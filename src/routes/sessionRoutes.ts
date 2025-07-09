import { Router } from 'express';
import { APIController } from '../controllers/APIController';

const router = Router();
const apiController = new APIController();

/**
 * @route GET /api/session
 * @description Get or create a new session
 * @returns {object} Session information
 */
router.get('/', apiController.getSession);

/**
 * @route DELETE /api/session/:sessionId
 * @description Clear session history
 * @param {string} sessionId - User session ID
 * @returns {object} Success message
 */
router.delete('/:sessionId', apiController.clearSession);

export default router;