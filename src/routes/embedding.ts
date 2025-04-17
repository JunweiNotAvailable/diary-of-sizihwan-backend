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
interface EmbeddingRequest {
  input: string;
}

// POST /chat - Process chat request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { input } = req.body as EmbeddingRequest;
    
    if (!input) {
      return res.status(400).json({
        success: false,
        error: 'Input is required'
      } as ApiResponse<null>);
    }

    const model = 'text-embedding-3-small';

    const response = await openai.embeddings.create({
      model,
      input
    });

    return res.json({
      success: true,
      data: { vector: response.data[0].embedding }
    } as ApiResponse<{ vector: number[] }>);

  } catch (error: any) {
    console.error('Error in processEmbedding:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 