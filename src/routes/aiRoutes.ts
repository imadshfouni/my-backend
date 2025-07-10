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

// 🔷 Helper: fetch live prices
async function getLivePrices() {
  const symbols = ['XAU/USD', 'EUR/USD', 'US30'];
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

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const prices = await getLivePrices();

    const marketContext = `
Current Market Prices:
Gold (XAU/USD): ${prices['XAU/USD']}
EUR/USD: ${prices['EUR/USD']}
US30 (Dow Jones): ${prices['US30']}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${marketContext}\n\n${input}` }
      ],
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({ result });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
});

export default router;
