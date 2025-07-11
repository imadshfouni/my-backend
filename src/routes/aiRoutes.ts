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

function computeTrendStructure(candles) {
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  if (last > first) return { name: 'Trend Structure', value: 'Bullish' };
  if (last < first) return { name: 'Trend Structure', value: 'Bearish' };
  return { name: 'Trend Structure', value: 'Neutral' };
}

function computeEMACross(candles) {
  const ema = (length, index) => {
    const slice = candles.slice(index - length + 1, index + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    return sum / length;
  };

  const latestIndex = candles.length - 1;
  const ema20 = ema(20, latestIndex);
  const ema50 = ema(50, latestIndex);

  if (ema20 > ema50) return { name: 'EMA 20/50 Cross', value: 'Bullish' };
  if (ema20 < ema50) return { name: 'EMA 20/50 Cross', value: 'Bearish' };
  return { name: 'EMA 20/50 Cross', value: 'Neutral' };
}

function computeRSI(candles, period = 14) {
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

function computeMACD(candles) {
  const closes = candles.map(c => c.close);

  const ema = (arr, length) => {
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

function computeBollingerBands(candles, period = 20) {
  const closes = candles.slice(-period).map(c => c.close);
  const mean = closes.reduce((acc, val) => acc + val, 0) / period;
  const variance = closes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
  const stddev = Math.sqrt(variance);

  const latestClose = candles[candles.length - 1].close;

  const upper = mean + 2 * stddev;
  const lower = mean - 2 * stddev;

  if (latestClose > upper) return { name: 'Bollinger Bands', value: 'Breakout Above' };
  if (latestClose < lower) return { name: 'Bollinger Bands', value: 'Breakout Below' };
  return { name: 'Bollinger Bands', value: 'Within Bands' };
}

function computeVolumeSpike(candles) {
  const volumes = candles.map(c => c.high - c.low); 
  const avgVol = volumes.slice(0, -1).reduce((acc, v) => acc + v, 0) / (volumes.length - 1);
  const latestVol = volumes[volumes.length - 1];

  if (latestVol > 1.5 * avgVol) return { name: 'Volume Spike', value: 'High' };
  return { name: 'Volume Spike', value: 'Normal' };
}

function computeFibonacciRetracement(candles) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const current = candles[candles.length - 1].close;
  const retracement38 = high - 0.382 * (high - low);
  const retracement61 = high - 0.618 * (high - low);

  if (current >= retracement61 && current <= retracement38) {
    return { name: 'Fibonacci Zone', value: 'In Retracement Zone' };
  }
  return { name: 'Fibonacci Zone', value: 'Outside Zone' };
}

function computeCandlestickPattern(candles) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (last.close > last.open && prev.close < prev.open && last.close > prev.open && last.open < prev.close) {
    return { name: 'Candlestick Pattern', value: 'Bullish Engulfing' };
  }
  if (last.close < last.open && prev.close > prev.open && last.close < prev.open && last.open > prev.close) {
    return { name: 'Candlestick Pattern', value: 'Bearish Engulfing' };
  }
  return { name: 'Candlestick Pattern', value: 'No Pattern' };
}

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const prices = await getLivePricesTwelveData();
    const candles = await fetchCandles();

    if (!prices['XAU/USD'] || !prices['EUR/USD']) {
      console.error('Error: Missing live price(s):', prices);
      return res.status(500).json({ message: 'Failed to fetch live market prices. Please try again later.' });
    }

    const indicators = [
      computeTrendStructure(candles),
      computeEMACross(candles),
      computeRSI(candles),
      computeMACD(candles),
      computeBollingerBands(candles),
      computeVolumeSpike(candles),
      computeFibonacciRetracement(candles),
      computeCandlestickPattern(candles)
    ];

    const bullishCount = indicators.filter(i =>
      ['Bullish', 'Oversold', 'Breakout Above', 'High', 'In Retracement Zone', 'Bullish Engulfing'].includes(i.value)
    ).length;

    const bearishCount = indicators.filter(i =>
      ['Bearish', 'Overbought', 'Breakout Below', 'Bearish Engulfing'].includes(i.value)
    ).length;

    const confluence = bullishCount > bearishCount ? 'Bullish' : 'Bearish';

    const marketContext = `
Current Market Prices:
Gold (XAU/USD): ${prices['XAU/USD']}
EUR/USD: ${prices['EUR/USD']}

Indicators:
${indicators.map(i => `✅ ${i.name}: ${i.value}`).join('\n')}

Bullish confirmations: ${bullishCount}
Bearish confirmations: ${bearishCount}
Overall confluence: ${confluence}
`;

    console.log('Market Context:', marketContext);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${marketContext}\n\n${input}` }
      ],
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({ result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

export default router;
