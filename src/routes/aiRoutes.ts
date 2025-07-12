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

const sessionContext: Map<string, string> = new Map();

async function getLivePrice(symbol: string) {
  const response = await axios.get(`${TWELVE_DATA_BASE_URL}/price`, {
    params: { symbol, apikey: TWELVE_DATA_API_KEY },
  });
  return parseFloat(response.data.price);
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
  const first = candles[0].close, last = candles.at(-1).close;
  return last > first ? 'Bullish' : last < first ? 'Bearish' : 'Neutral';
}

function computeEMACross(candles: any[]) {
  const ema = (len: number, i: number) => candles.slice(i-len+1,i+1).reduce((a,c)=>a+c.close,0)/len;
  const li = candles.length - 1;
  const ema20 = ema(20, li), ema50 = ema(50, li);
  return ema20 > ema50 ? 'Bullish' : ema20 < ema50 ? 'Bearish' : 'Neutral';
}

function computeRSI(candles: any[], period = 14) {
  const closes = candles.map(c => c.close), deltas = closes.slice(1).map((c,i) => c - closes[i]);
  let g = 0, l = 0;
  deltas.slice(-period).forEach(d => d > 0 ? g += d : l -= d);
  const rs = g / (l || 1), rsi = 100 - (100 / (1 + rs));
  return rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
}

function computeMACD(candles: any[]) {
  const closes = candles.map(c => c.close);
  const ema = (arr: number[], len: number) => {
    const k = 2 / (len + 1);
    let e = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      e.push(arr[i] * k + e[i-1] * (1 - k));
    }
    return e;
  };
  const ema12 = ema(closes, 12), ema26 = ema(closes, 26);
  const macd = ema12.map((v,i) => v - ema26[i]);
  const sig = ema(macd, 9);
  const m = macd.at(-1), s = sig.at(-1);
  return m > s ? 'Bullish' : m < s ? 'Bearish' : 'Neutral';
}

function detectSymbol(input: string): string {
  const text = input.toLowerCase();
  if (text.includes('gold') || text.includes('xau')) return 'XAU/USD';
  if (text.includes('btc') || text.includes('bitcoin')) return 'BTC/USD';
  if (text.includes('eur')) return 'EUR/USD';
  if (text.includes('gbp')) return 'GBP/USD';
  if (text.includes('nasdaq') || text.includes('nas')) return 'NAS100';
  if (text.includes('sp500') || text.includes('s&p')) return 'US500';
  return 'XAU/USD';
}

router.post('/chat', async (req, res) => {
  const { input, sessionId = 'default' } = req.body;
  if (!input) return res.status(400).json({ message: 'Missing input' });

  const lowerInput = input.toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(input);

  if (['hi', 'hello', 'hey', 'مرحبا', 'اهلا'].some(greet => lowerInput.includes(greet))) {
    return res.json({
      result: `Welcome! I’m here to help you trade with confidence and discipline. How can I assist you with your trading today?`
    });
  }

  const analysisKeywords = ['analyze', 'analysis', 'حلل', 'تحليل'];
  const isAnalysisRequest = analysisKeywords.some(k => lowerInput.includes(k));

  let tradeSignalSummary = sessionContext.get(sessionId) || '';

  if (isAnalysisRequest) {
    try {
      const symbol = detectSymbol(input);
      const price = await getLivePrice(symbol);
      const candles = await fetchCandles(symbol);

      const confirmations = [
        computeTrendStructure(candles),
        computeEMACross(candles),
        computeRSI(candles),
        computeMACD(candles),
      ];

      let bullish = 0, bearish = 0;
      confirmations.forEach(c => {
        if (c === 'Bullish' || c === 'Oversold') bullish++;
        if (c === 'Bearish' || c === 'Overbought') bearish++;
      });

      const direction = bullish > bearish ? 'BUY' : 'SELL';
      const entry = bullish > bearish ? price + 1 : price - 1;
      const sl = bullish > bearish ? price - 10 : price + 10;
      const tp = bullish > bearish ? price + 12 : price - 12;

      const reason =
        bullish > bearish
          ? `Given the bullish trend in ${symbol} and the confluence of bullish indicators, it is advisable to look for buying opportunities.`
          : `Given the bearish trend in ${symbol} and the confluence of bearish indicators, it is advisable to look for selling opportunities.`;

      tradeSignalSummary = `
📈 Direction: ${direction}  
🎯 Entry: ${entry.toFixed(2)}  
🛑 Stop Loss: ${sl.toFixed(2)}  
🎯 Take Profit: ${tp.toFixed(2)}  
📝 Reason: ${reason} Current price is ${price.toFixed(2)}.
`;

      sessionContext.set(sessionId, tradeSignalSummary);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error computing analysis' });
    }
  }

  const languageInstruction = isArabic
    ? 'Please respond fully in Arabic.'
    : 'Please respond fully in English.';

  const prompt = `
${languageInstruction}

You must always use the most recent trade signal and analysis context below to guide your reply.

Most recent trade signal:
${tradeSignalSummary || 'No trade signal has been provided yet.'}

The user now says: "${input}"

Always assume the user’s message is about trading or related to the most recent analysis — even if it is vague, indirect, conversational, or phrased as a question about markets, instruments, profitability, or preferences. Never reset the conversation while context exists.

If the user’s question is clear and trading-related, answer fully and professionally.
If the question is clear but unrelated to trading or financial markets, politely and confidently steer the conversation back to trading.
If the question is vague or unclear, politely ask for clarification while offering a general trading insight in the meantime.
Always match the user’s language and respond professionally and confidently.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    });

    const result = completion.choices[0]?.message?.content || 'No response from AI.';
    res.json({ result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

export default router;
