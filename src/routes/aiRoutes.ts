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

function computeTrendStructure(candles: any[]) {
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  return last > first ? 'Bullish' : last < first ? 'Bearish' : 'Neutral';
}

function computeEMACross(candles: any[]) {
  const ema = (length: number, index: number) => {
    const slice = candles.slice(index - length + 1, index + 1);
    const sum = slice.reduce((acc: number, c: any) => acc + c.close, 0);
    return sum / length;
  };
  const latest = candles.length - 1;
  const ema20 = ema(20, latest);
  const ema50 = ema(50, latest);
  return ema20 > ema50 ? 'Bullish' : ema20 < ema50 ? 'Bearish' : 'Neutral';
}

function computeRSI(candles: any[], period = 14) {
  const closes = candles.map(c => c.close);
  const deltas = closes.slice(1).map((c, i) => c - closes[i]);
  let gains = 0, losses = 0;
  deltas.slice(-period).forEach(d => {
    if (d > 0) gains += d;
    else losses -= d;
  });
  const rs = gains / (losses || 1);
  const rsi = 100 - (100 / (1 + rs));
  return rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
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
  return latestMacd > latestSignal ? 'Bullish' : latestMacd < latestSignal ? 'Bearish' : 'Neutral';
}

router.post('/chat', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  const lowerInput = input.toLowerCase();

  if (['hi', 'hello', 'hey', 'مرحبا', 'اهلا'].some(greet => lowerInput.includes(greet))) {
    return res.json({
      result: `Welcome! I’m here to help you trade with confidence and discipline. How can I assist you with your trading today?`
    });
  }

  const supportedSymbols: Set<string> = req.app.locals.supportedSymbols;

  try {
    const symbolsToFetch = ['XAU/USD']
      .filter(s => supportedSymbols.has(s));

    const prices = await getLivePricesTwelveData(symbolsToFetch);
    const candles = await fetchCandles('XAU/USD');

    const trend = computeTrendStructure(candles);
    const emaCross = computeEMACross(candles);
    const rsi = computeRSI(candles);
    const macd = computeMACD(candles);

    const confluences = [
      `Trend Structure: ${trend}`,
      `EMA 20/50 Cross: ${emaCross}`,
      `RSI: ${rsi}`,
      `MACD: ${macd}`
    ];

    const marketSummary = `
Gold (XAU/USD) current price: ${prices['XAU/USD']}.
Overall trend: ${trend}.
Key technical confluences: ${confluences.join(', ')}.
`;

    const marketContext = `
You are provided with the latest market data and confluences. Use this information to generate a clear, actionable trade plan with Direction, Entry, Stop Loss, and Take Profit, phrased in the same language the user used (English or Arabic).

Market Summary:
${marketSummary}

Respond professionally, motivationally, and always include a structured trade plan if analysis is requested. If the user asks about trading concepts, risk management, or strategies, explain clearly and helpfully.
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
