import { Router } from 'express';
import { ForexController } from '../controllers/ForexController';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();
const forexController = new ForexController();

// Apply optional authentication to all routes
router.use(optionalAuthenticate);

// Routes
router.get('/rates', forexController.getRates);
router.get('/rates/:symbol', forexController.getRate);
router.get('/news', forexController.getNews);
router.get('/calendar', forexController.getEconomicCalendar);

export default router;