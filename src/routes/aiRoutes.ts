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

// 🪄 Extracts a trading symbol like XAU/USD from text
function extractSymbol(text: string): string | null {
  const match = text.match(/\b[A-Z]{3,5}\/[A-Z]{3,5}\b/);
  return match ? match[0].toUpperCase() : null;
}

// 🔷 Fetch live prices for one or more symbols
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

// 🔷 Fetch candles for a given symbol
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

// 🔷 Indicator logic remains unchanged
function computeTrendStructure(candles: any[]) {
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  if (last > first) return { name: 'Trend Structure', value: 'Bullish' };
  if (last < first) return { name: 'Trend Structure', value: 'Bearish' };
  return { name: 'Trend Structure', value: 'Neutral' };
}

function computeEMACross(candles: any[]) {
  const ema = (length: number, index: number) => {
    const slice = candles.slice(index - length + 1, index + 1);
    const sum = slice.reduce((acc: number, c: any) => acc + c.close, 0);
    return sum / length;
  };

  const latestIndex = candles.length - 1;
  const ema20 = ema(20, latestIndex);
  const ema50 = ema(50, latestIndex);

  if (ema20 > ema50) return { name: 'EMA 20/50 Cross', value: 'Bullish' };
  if (ema20 < ema50) return { name: 'EMA 20/50 Cross', value: 'Bearish' };
  return { name: 'EMA 20/50 Cross', value: 'Neutral' };
}

function computeRSI(candles: any[], period = 14) {
  const closes = candles.map(c => c.close);
  const deltas = [];

  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }

  let gains = 0, losses = 0;
  for (let i = deltas.length - period; i < deltas.length; i++) {
    if (deltas[i] > 0) gains += deltas[i];
    else losses -= deltas[i];
  }

  const avgGain = gains / period;
  const avgLoss = losses / period || 1;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  if (rsi > 70) return { name: 'RSI', value: 'Overbought' };
  if (rsi < 30) return { name: 'RSI', value: 'Oversold' };
  return { name: 'RSI', value: 'Neutral' };
}

function computeMACD(candles: any[]) {
  const closes = candles.map(c => c.close);

  const ema = (arr: number[], length: number) => {
    const k = 2 / (length + 1);
    let emaArr = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k));
    }
    return emaArr;
  };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);

  const latestMacd = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];

  if (latestMacd > latestSignal) return { name: 'MACD', value: 'Bullish' };
  if (latestMacd < latestSignal) return { name: 'MACD', value: 'Bearish' };
  return { name: 'MACD', value: 'Neutral' };
}

// 🔷 POST /chat route
router.post('/chat', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  const lowerInput = input.toLowerCase();

  // If just a greeting
  if (['hi', 'hello', 'hey'].some(greet => lowerInput.includes(greet))) {
    return res.json({
      result: `Hello! I’m your trading advisor. Tell me what you’d like me to analyze (e.g., Gold, EUR/USD, NASDAQ).`
    });
  }

  const symbol = extractSymbol(input);

  if (!symbol) {
    return res.status(400).json({ message: `Could not detect a symbol in your input. Please specify like 'XAU/USD' or 'EUR/USD'.` });
  }

  if (!req.app.locals.supportedSymbols?.has(symbol)) {
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
