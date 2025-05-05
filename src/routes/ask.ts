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
  systemPrompt: string;
  message: string;
  isJson?: boolean;
}

// POST /ask - Process chat request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, message, isJson } = req.body as ChatRequest;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      } as ApiResponse<null>);
    }

    const model = 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
      response_format: isJson ? { type: 'json_object' } : undefined
    });

    let response = completion.choices[0]?.message?.content || '';
    if (isJson) {
      response = JSON.parse(response);
    }

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