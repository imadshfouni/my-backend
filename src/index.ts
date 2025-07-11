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
import fetch from 'node-fetch';

// Initialize services
const forexService = ForexDataService.getInstance();
forexService.initialize();

// Load environment variables
const PORT = ConfigManager.get('PORT', '3000');
const UPLOAD_DIR = ConfigManager.get('UPLOAD_DIR', 'uploads');
const TWELVE_DATA_API_KEY = ConfigManager.get('TWELVE_DATA_API_KEY', '');

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
app.use(sessionManager);

// Serve static files from the uploads directory
app.use(`/${UPLOAD_DIR}`, express.static(UPLOAD_DIR));

// 🪄 Load and refresh supported forex symbols
async function loadSupportedSymbols() {
  try {
    const res = await fetch(`https://api.twelvedata.com/symbol_search?symbol=&exchange=forex&apikey=${TWELVE_DATA_API_KEY}`);
    const data = await res.json();

    const symbols = new Set<string>();

    if (data.data) {
      data.data.forEach((item: any) => {
        const cleanSymbol = item.symbol.split(':')[0].toUpperCase();
        symbols.add(cleanSymbol);
      });
      app.locals.supportedSymbols = symbols;

      console.log(`✅ Loaded ${symbols.size} forex symbols from Twelve Data.`);
      console.log(`Sample symbols: ${[...symbols].slice(0, 10).join(', ')}`);
    } else {
      console.error('Failed to load symbols:', data);
    }
  } catch (err) {
    console.error('Error fetching supported symbols:', err);
  }
}

// Initial load and refresh every 6 hours
loadSupportedSymbols();
setInterval(loadSupportedSymbols, 6 * 60 * 60 * 1000);

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
