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
  const li=candles.length-1,ema20=ema(20,li),ema50=ema(50,li);
  return ema20>ema50?'Bullish':ema20<ema50?'Bearish':'Neutral';
}
function computeRSI(candles: any[], period=14) {
  const closes=candles.map(c=>c.close), deltas=closes.slice(1).map((c,i)=>c-closes[i]);
  let g=0,l=0; deltas.slice(-period).forEach(d=>d>0?g+=d:l-=d);
  const rs=g/(l||1),rsi=100-(100/(1+rs));
  return rsi>70?'Overbought':rsi<30?'Oversold':'Neutral';
}
function computeMACD(candles: any[]) {
  const closes=candles.map(c=>c.close), ema=(arr,len)=>{const k=2/(len+1);let e=[arr[0]];for(let i=1;i<arr.length;i++)e.push(arr[i]*k+e[i-1]*(1-k));return e};
  const ema12=ema(closes,12),ema26=ema(closes,26),macd=ema12.map((v,i)=>v-ema26[i]),sig=ema(macd,9),m=macd.at(-1),s=sig.at(-1);
  return m>s?'Bullish':m<s?'Bearish':'Neutral';
}

// 🧠 Detect requested symbol
function detectSymbol(input: string): string {
  const text = input.toLowerCase();
  if (text.includes('gold') || text.includes('xau')) return 'XAU/USD';
  if (text.includes('btc') || text.includes('bitcoin')) return 'BTC/USD';
  if (text.includes('eur')) return 'EUR/USD';
  if (text.includes('gbp')) return 'GBP/USD';
  if (text.includes('nasdaq') || text.includes('nas')) return 'NAS100';
  if (text.includes('sp500') || text.includes('s&p')) return 'US500';
  return 'XAU/USD'; // default
}

router.post('/chat', async (req, res) => {
  const { input } = req.body;
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

  if (!isAnalysisRequest) {
    const politeResponse = isArabic
      ? 'أنا بخير، شكرًا لسؤالك! أنا هنا لمساعدتك في التداول. ما الذي تود تحليله أو مناقشته اليوم؟'
      : 'I’m doing great, thank you for asking! I’m here to help you with your trading. What would you like to analyze or discuss today?';
    return res.json({ result: politeResponse });
  }

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
        ? `Given the bullish trend in ${symbol} and the confluence of bullish indicators such as EMA 20/50 Cross and MACD, it is advisable to look for buying opportunities.`
        : `Given the bearish trend in ${symbol} and the confluence of bearish indicators such as EMA 20/50 Cross and MACD, it is advisable to look for selling opportunities.`;

    const tradeSignal = `
📈 Direction: ${direction}  
🎯 Entry: ${entry.toFixed(2)}  
🛑 Stop Loss: ${sl.toFixed(2)}  
🎯 Take Profit: ${tp.toFixed(2)}  
📝 Reason: ${reason} Current price is ${price.toFixed(2)}.
`;

    const languageInstruction = isArabic
      ? 'Please respond fully in Arabic.'
      : 'Please respond fully in English.';

    const prompt = `
${languageInstruction}

Here is the computed trade signal and reason:
${tradeSignal}

Please phrase this professionally, clearly, and motivationally.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
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
