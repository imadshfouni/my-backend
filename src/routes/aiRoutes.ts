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

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const prices = await getLivePricesTwelveData();

    if (!prices['XAU/USD'] || !prices['EUR/USD']) {
      console.error('Error: Missing live price(s):', prices);
      return res.status(500).json({ message: 'Failed to fetch live market prices. Please try again later.' });
    }

    const marketContext = `
Current Market Prices:
Gold (XAU/USD): ${prices['XAU/USD']}
EUR/USD: ${prices['EUR/USD']}
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
