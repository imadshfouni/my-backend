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

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

async function getLivePricesFinnhub() {
  const symbols = {
    'XAU/USD': 'OANDA:XAU_USD',
    'EUR/USD': 'OANDA:EUR_USD',
    'US30': 'OANDA:US30_USD'
  };

  const prices = {};

  for (const [key, finnhubSymbol] of Object.entries(symbols)) {
    const response = await axios.get(`https://finnhub.io/api/v1/quote`, {
      params: {
        symbol: finnhubSymbol,
        token: FINNHUB_API_KEY
      }
    });
    prices[key] = response.data.c; // c = current price
  }

  return prices;
}

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const prices = await getLivePricesFinnhub();

    if (!prices['XAU/USD'] || !prices['EUR/USD'] || !prices['US30']) {
      console.error('Error: Missing live price(s):', prices);
      return res.status(500).json({ message: 'Failed to fetch live market prices. Please try again later.' });
    }

    const marketContext = `
Current Market Prices:
Gold (XAU/USD): ${prices['XAU/USD']}
EUR/USD: ${prices['EUR/USD']}
US30 (Dow Jones): ${prices['US30']}
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
