import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { ApiResponse } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const apiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: apiKey });

// Chat request interface
interface ChatRequest {
  message: string;
  stream?: boolean;
}

// POST /chat - Process chat request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, stream = false } = req.body as ChatRequest;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      } as ApiResponse<null>);
    }

    const model = 'gpt-4o-mini';

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: message }],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: message }],
    });

    const response = completion.choices[0]?.message?.content || '';

    return res.json({
      success: true,
      data: { response }
    } as ApiResponse<{ response: string }>);

  } catch (error: any) {
    console.error('Error in processChat:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 