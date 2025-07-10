import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: input }],
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({ result });
  } catch (error: any) {
    console.error('OpenAI error:', error);
    res.status(500).json({ message: 'Error from OpenAI', error: error.message });
  }
});

export default router;

