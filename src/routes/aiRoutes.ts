import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getOrCreateSession } from '../middlewares/sessionManager';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPromptPath = path.join(process.cwd(), 'data', 'system_prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

async function getLivePricesTwelveData() {
  const symbols = ['XAU/USD', 'EUR/USD'];
  const promises = symbols.map(symbol =>
    axios.get(`${TWELVE_DATA_BASE_URL}/price`, {
      params: { symbol, apikey: TWELVE_DATA_API_KEY },
    })
  );

  const results = await Promise.all(promises);

  const prices = {};
  symbols.forEach((symbol, i) => {
    prices[symbol] = results[i].data.price;
  });

  return prices;
}

async function fetchCandles(symbol = 'XAU/USD', interval = '1h', length = 50) {
  const response = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
    params: {
      symbol,
      interval,
      outputsize: length,
      apikey: TWELVE_DATA_API_KEY
    }
  });

  return response.data.values.reverse().map(c => ({
    time: c.datetime,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close)
  }));
}

// Indicators & SMC
function computeTrendStructure(candles) {
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  if (last > first) return 'Bullish';
  if (last < first) return 'Bearish';
  return 'Neutral';
}

function computeRSI(candles, period = 14) {
  const closes = candles.map(c => c.close);
  const deltas = closes.map((c, i) => i === 0 ? 0 : c - closes[i-1]);
  const gains = deltas.slice(-period).filter(d => d > 0).reduce((a,b) => a+b, 0) / period;
  const losses = Math.abs(deltas.slice(-period).filter(d => d < 0).reduce((a,b) => a+b, 0)) / period;
  const rs = gains / (losses || 1);
  const rsi = 100 - (100 / (1+rs));
  if (rsi > 70) return 'Overbought';
  if (rsi < 30) return 'Oversold';
  return 'Neutral';
}

function detectBOS(candles) {
  const prevHigh = Math.max(candles[candles.length-3].high, candles[candles.length-4].high);
  const prevLow = Math.min(candles[candles.length-3].low, candles[candles.length-4].low);
  const latest = candles[candles.length-1].close;
  if (latest > prevHigh) return 'Bullish BOS';
  if (latest < prevLow) return 'Bearish BOS';
  return 'No BOS';
}

function detectLiquidityGrab(candles) {
  const prevLow = candles[candles.length-2].low;
  const latestLow = candles[candles.length-1].low;
  const latestClose = candles[candles.length-1].close;
  if (latestLow < prevLow && latestClose > prevLow) return 'Bullish Liquidity Grab';
  const prevHigh = candles[candles.length-2].high;
  const latestHigh = candles[candles.length-1].high;
  if (latestHigh > prevHigh && latestClose < prevHigh) return 'Bearish Liquidity Grab';
  return 'No Liquidity Grab';
}

router.post('/', async (req, res) => {
  getOrCreateSession(req);

  const { input } = req.body;
  if (!input) return res.status(400).json({ message: 'Missing input' });

  try {
    const prices = await getLivePricesTwelveData();
    const candles = await fetchCandles();

    const trend = computeTrendStructure(candles);
    const rsi = computeRSI(candles);
    const bos = detectBOS(candles);
    const liquidity = detectLiquidityGrab(candles);

    const marketContext = `
Current Market Prices:
Gold (XAU/USD): ${prices['XAU/USD']}
EUR/USD: ${prices['EUR/USD']}

Indicators:
- Trend Structure: ${trend}
- RSI: ${rsi}
- SMC BOS: ${bos}
- Liquidity Grab: ${liquidity}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${marketContext}\n\n${input}` }
      ]
    });

    res.json({ result: completion.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

export default router;
