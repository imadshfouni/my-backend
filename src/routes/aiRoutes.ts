import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPromptPath = path.join(process.cwd(), 'data', 'system_prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

// 🪄 Extracts a trading symbol like XAU/USD or xauusd or gold
function extractSymbol(text: string): string | null {
  const normalized = text.toUpperCase();

  const matchSlash = normalized.match(/\b[A-Z]{3}\/[A-Z]{3}\b/);
  if (matchSlash) return matchSlash[0];

  const matchNoSlash = normalized.match(/\b[A-Z]{6}\b/);
  if (matchNoSlash) {
    const sym = matchNoSlash[0];
    return `${sym.substring(0,3)}/${sym.substring(3,6)}`;
  }

  const nicknames: Record<string, string> = {
    GOLD: 'XAU/USD',
    EUR: 'EUR/USD',
    EURO: 'EUR/USD',
    USD: 'USD',
    GBP: 'GBP/USD'
  };

  for (const [key, value] of Object.entries(nicknames)) {
    if (normalized.includes(key)) return value;
  }

  return null;
}

async function getLivePricesTwelveData(symbols: string[]) {
  const promises = symbols.map(symbol =>
    axios.get(`${TWELVE_DATA_BASE_URL}/price`, {
      params: { symbol, apikey: TWELVE_DATA_API_KEY },
    })
  );

  const results = await Promise.all(promises);

  const prices: Record<string, string> = {};
  symbols.forEach((symbol, i) => {
    prices[symbol] = results[i].data.price;
  });

  return prices;
}

async function fetchCandles(symbol: string, interval = '1h', length = 50) {
  const response = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
    params: {
      symbol,
      interval,
      outputsize: length,
      apikey: TWELVE_DATA_API_KEY
    }
  });

  return response.data.values.reverse().map((c: any) => ({
    time: c.datetime,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close)
  }));
}

// 🔷 Indicators stay unchanged (as in your version) …
function computeTrendStructure(candles: any[]) { /* … */ }
function computeEMACross(candles: any[]) { /* … */ }
function computeRSI(candles: any[], period = 14) { /* … */ }
function computeMACD(candles: any[]) { /* … */ }

// 🔷 POST /chat route
router.post('/chat', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  const lowerInput = input.toLowerCase();

  if (['hi', 'hello', 'hey'].some(greet => lowerInput.includes(greet))) {
    return res.json({
      result: `Hello! I’m your trading advisor. Tell me what you’d like me to analyze (e.g., Gold, EUR/USD, NASDAQ).`
    });
  }

  const symbol = extractSymbol(input);

  if (!symbol) {
    return res.status(400).json({ message: `Could not detect a symbol in your input. Please specify like 'XAU/USD' or 'EUR/USD'.` });
  }

  const supportedSymbols: Set<string> = req.app.locals.supportedSymbols;

  if (!supportedSymbols || !supportedSymbols.has(symbol)) {
    return res.status(400).json({ message: `Symbol '${symbol}' is not supported.` });
  }

  try {
    const prices = await getLivePricesTwelveData([symbol]);
    const candles = await fetchCandles(symbol);

    const indicators = [
      computeTrendStructure(candles),
      computeEMACross(candles),
      computeRSI(candles),
      computeMACD(candles),
    ];

    const bullishCount = indicators.filter(i =>
      ['Bullish', 'Oversold'].includes(i.value)
    ).length;

    const bearishCount = indicators.filter(i =>
      ['Bearish', 'Overbought'].includes(i.value)
    ).length;

    const confluence = bullishCount > bearishCount ? 'Bullish' : 'Bearish';

    const marketContext = `
Current Market Price:
${symbol}: ${prices[symbol]}

Indicators:
${indicators.map(i => `✅ ${i.name}: ${i.value}`).join('\n')}

Bullish confirmations: ${bullishCount}
Bearish confirmations: ${bearishCount}
Overall confluence: ${confluence}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${marketContext}\n\n${input}` }
      ],
    });

    const result = completion.choices[0]?.message?.content || 'No response from AI.';

    res.json({ result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

export default router;
