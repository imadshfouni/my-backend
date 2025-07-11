import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const systemPromptPath = path.join(process.cwd(), 'data', 'system_prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';

async function getLivePrice(symbol: string): Promise<string | null> {
  try {
    const res = await axios.get(`${TWELVE_DATA_BASE_URL}/price`, {
      params: { symbol, apikey: TWELVE_DATA_API_KEY }
    });
    return res.data.price || null;
  } catch {
    return null;
  }
}

async function fetchCandles(symbol: string, interval = '1h', length = 50) {
  const res = await axios.get(`${TWELVE_DATA_BASE_URL}/time_series`, {
    params: { symbol, interval, outputsize: length, apikey: TWELVE_DATA_API_KEY }
  });
  return res.data.values.reverse().map((c: any) => ({
    time: c.datetime,
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close)
  }));
}

// === Indicator functions ===

function trendStructure(candles: any[]) {
  return candles.at(-1).close > candles[0].close ? 'Bullish' : 'Bearish';
}

function emaCross(candles: any[]) {
  const ema = (len: number, idx: number) => {
    const slice = candles.slice(idx - len + 1, idx + 1);
    return slice.reduce((a, c) => a + c.close, 0) / len;
  };
  const idx = candles.length - 1;
  const ema20 = ema(20, idx), ema50 = ema(50, idx);
  return ema20 > ema50 ? 'Bullish' : ema20 < ema50 ? 'Bearish' : 'Neutral';
}

function rsi(candles: any[], len = 14) {
  const closes = candles.map(c => c.close);
  const deltas = closes.slice(1).map((v, i) => v - closes[i]);
  const gains = deltas.slice(-len).filter(d => d > 0).reduce((a, b) => a + b, 0) / len;
  const losses = Math.abs(deltas.slice(-len).filter(d => d < 0).reduce((a, b) => a + b, 0)) / len || 1;
  const rs = gains / losses;
  const rsi = 100 - (100 / (1 + rs));
  if (rsi > 70) return 'Overbought';
  if (rsi < 30) return 'Oversold';
  return 'Neutral';
}

function macd(candles: any[]) {
  const closes = candles.map(c => c.close);
  const ema = (arr: number[], len: number) => {
    const k = 2 / (len + 1);
    let e = arr[0];
    return arr.map(v => (e = v * k + e * (1 - k)));
  };
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macd, 9);
  return macd.at(-1) > signal.at(-1) ? 'Bullish' : 'Bearish';
}

function bollingerBands(candles: any[], len = 20) {
  const closes = candles.slice(-len).map(c => c.close);
  const mean = closes.reduce((a, b) => a + b) / len;
  const std = Math.sqrt(closes.reduce((a, b) => a + (b - mean) ** 2, 0) / len);
  const upper = mean + 2 * std, lower = mean - 2 * std;
  const last = candles.at(-1).close;
  if (last > upper) return 'Breakout Above';
  if (last < lower) return 'Breakout Below';
  return 'Within Bands';
}

function volumeSpike(candles: any[]) {
  const vols = candles.map(c => c.high - c.low);
  const avg = vols.slice(0, -1).reduce((a, b) => a + b) / (vols.length - 1);
  return vols.at(-1) > 1.5 * avg ? 'High' : 'Normal';
}

function fibonacciRetracement(candles: any[]) {
  const highs = candles.map(c => c.high), lows = candles.map(c => c.low);
  const high = Math.max(...highs), low = Math.min(...lows), close = candles.at(-1).close;
  const r38 = high - 0.382 * (high - low), r61 = high - 0.618 * (high - low);
  return close >= r61 && close <= r38 ? 'In Retracement Zone' : 'Outside Zone';
}

function candlestickPattern(candles: any[]) {
  const last = candles.at(-1), prev = candles.at(-2);
  if (last.close > last.open && prev.close < prev.open && last.close > prev.open && last.open < prev.close)
    return 'Bullish Engulfing';
  if (last.close < last.open && prev.close > prev.open && last.close < prev.open && last.open > prev.close)
    return 'Bearish Engulfing';
  return 'No Pattern';
}

// Placeholder — implement properly later
function srBreakout() {
  return 'No Breakout';
}

function smcPattern() {
  return 'No SMC Signal';
}

router.post('/chat', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ message: 'Missing input' });

  const pairMatch = input.match(/([A-Z]{3,5}\/[A-Z]{3,5})/i);
  const pair = pairMatch?.[0].toUpperCase() || null;

  if (!pair) {
    return res.json({ result: '❌ Please specify a trading pair like `XAU/USD`.' });
  }

  const price = await getLivePrice(pair);
  if (!price) {
    return res.json({ result: `❌ Could not fetch data for ${pair}. Please check the symbol and try again.` });
  }

  const candles = await fetchCandles(pair);

  const confirmations = [
    { name: 'Trend Structure', value: trendStructure(candles) },
    { name: 'EMA 20/50 Cross', value: emaCross(candles) },
    { name: 'RSI', value: rsi(candles) },
    { name: 'MACD', value: macd(candles) },
    { name: 'Bollinger Bands', value: bollingerBands(candles) },
    { name: 'Volume Spike', value: volumeSpike(candles) },
    { name: 'Fibonacci Retracement', value: fibonacciRetracement(candles) },
    { name: 'Candlestick Pattern', value: candlestickPattern(candles) },
    { name: 'Support/Resistance Breakout', value: srBreakout() },
    { name: 'SMC Pattern', value: smcPattern() },
  ];

  const bullish = confirmations.filter(c => /Bullish|Oversold|Breakout Above|In Retracement Zone/.test(c.value)).length;
  const bearish = confirmations.filter(c => /Bearish|Overbought|Breakout Below/.test(c.value)).length;

  const confluence = bullish > bearish ? 'Bullish' : 'Bearish';

  const marketContext = `
Pair: ${pair}
Price: ${price}

Confirmations:
${confirmations.map(c => `✅ ${c.name}: ${c.value}`).join('\n')}

Bullish confirmations: ${bullish}
Bearish confirmations: ${bearish}
Overall Confluence: ${confluence}
`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${marketContext}\n\n${input}` }
    ]
  });

  res.json({ result: completion.choices[0]?.message?.content || '' });
});

export default router;
