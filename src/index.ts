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

app.set('trust proxy', 1);

app.use(cors({
  origin: 'https://ai.finverseinvest.io',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(sessionManager);

app.use(`/${UPLOAD_DIR}`, express.static(UPLOAD_DIR));

async function loadSymbolsFromEndpoint(endpoint: string, label: string): Promise<Set<string>> {
  const symbols = new Set<string>();
  try {
    const res = await fetch(`https://api.twelvedata.com/${endpoint}?apikey=${TWELVE_DATA_API_KEY}`);
    const data = await res.json();

    if (data.data) {
      data.data.forEach((item: any) => {
        const cleanSymbol = `${item.symbol}`.toUpperCase();
        symbols.add(cleanSymbol);
      });
      console.log(`✅ Loaded ${symbols.size} ${label} symbols.`);
    } else {
      console.error(`❌ Failed to load ${label} symbols`, data);
    }
  } catch (err) {
    console.error(`❌ Error fetching ${label} symbols`, err);
  }
  return symbols;
}

async function loadSupportedSymbols() {
  console.log(`🔄 Loading supported symbols from Twelve Data…`);

  const [forex, crypto, indices, commodities] = await Promise.all([
    loadSymbolsFromEndpoint('forex_pairs', 'forex'),
    loadSymbolsFromEndpoint('cryptocurrencies', 'crypto'),
    loadSymbolsFromEndpoint('indices', 'indices'),
    loadSymbolsFromEndpoint('commodities', 'commodities'),
  ]);

  const allSymbols = new Set<string>([
    ...forex,
    ...crypto,
    ...indices,
    ...commodities,
    'XAU/USD', // explicitly add gold
    'XAG/USD', // explicitly add silver
  ]);

  app.locals.supportedSymbols = allSymbols;

  console.log(`✅ Total supported symbols: ${allSymbols.size}`);
  console.log(`Sample symbols: ${[...allSymbols].slice(0, 10).join(', ')}`);
}

// Initial load & refresh every 6 hours
loadSupportedSymbols();
setInterval(loadSupportedSymbols, 6 * 60 * 60 * 1000);

app.use('/api', apiRoutes);
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
