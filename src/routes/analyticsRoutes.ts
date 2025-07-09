import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply optional authentication to all routes
router.use(optionalAuthenticate);

// Dashboard and summary routes
router.get('/dashboard', analyticsController.getDashboardSummary);

// Historical data routes
router.get('/historical/:symbol/:timeframe', analyticsController.getHistoricalData);

// Sentiment routes
router.get('/sentiment', analyticsController.getSentiment);
router.get('/sentiment/:symbol', analyticsController.getSentiment);

// Technical indicator routes
router.get('/indicators/:symbol', analyticsController.getIndicators);

// Correlation routes
router.get('/correlation', analyticsController.getCorrelation);
router.get('/correlation/:symbol1/:symbol2', analyticsController.getCorrelation);

// Available options routes
router.get('/symbols', analyticsController.getSymbols);
router.get('/timeframes', analyticsController.getTimeframes);

export default router;