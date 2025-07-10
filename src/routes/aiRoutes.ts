import { Router } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 📝 Load the system prompt at startup
const systemPromptPath = path.join(process.cwd(), 'data', 'system_prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

router.post('/', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Missing input' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // ✅ keep or upgrade to gpt-4 if available
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ],
    });

    const result = completion.choices[0]?.message?.content || '';

    res.json({ result });
  } catch (error: any) {
    console.error('OpenAI error:', error);
    res.status(500).json({ message: 'Error from OpenAI', error: error.message });
  }
});

export default router;
