import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import multer from 'multer';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { ConfigManager } from './utils/config';
import { ForexDataService } from './services/ForexDataService';

// Initialize services
const forexService = ForexDataService.getInstance();
forexService.initialize();

// Load environment variables
const PORT = ConfigManager.get('PORT', '3000');
const SESSION_SECRET = ConfigManager.get('SESSION_SECRET', 'forex_advisor_secret');
const UPLOAD_DIR = ConfigManager.get('UPLOAD_DIR', 'uploads');

// Create Express app
const app = express();

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

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files from the uploads directory
app.use(`/${UPLOAD_DIR}`, express.static(UPLOAD_DIR));

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;