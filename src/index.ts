import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import multer from 'multer';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ConfigManager } from './utils/config';
import { ForexDataService } from './services/ForexDataService';
import { sessionManager } from './middlewares/sessionManager';

// Initialize services
const forexService = ForexDataService.getInstance();
forexService.initialize();

// Load environment variables
const PORT = ConfigManager.get('PORT', '3000');
const UPLOAD_DIR = ConfigManager.get('UPLOAD_DIR', 'uploads');

// Create Express app
const app = express();

// ✅ Tell Express to trust the first proxy (Render/Vercel/Heroku etc.)
app.set('trust proxy', 1);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// ✅ Use CORS with your real frontend domain
app.use(cors({
  origin: 'https://ai.finverseinvest.io', // replace with your frontend URL
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(sessionManager); // ✅ use the custom session middleware

// Serve static files from the uploads directory
app.use(`/${UPLOAD_DIR}`, express.static(UPLOAD_DIR));

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
