import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { ApiResponse } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const apiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: apiKey });

// Image OCR request interface
interface ImageOcrRequest {
  imageUrl: string;
  prompt?: string;
}

// POST /image - Process image for OCR
router.post('/', async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body as ImageOcrRequest;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      } as ApiResponse<null>);
    }

    // Use gpt-4o-mini model for OCR
    const model = 'gpt-4o-mini';

    // Create the completion with the image
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Get the student's name and ID from the image in JSON format: {\"name\": <name>, \"id\": <id>}" },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const extractedText = response.choices[0]?.message?.content || '';
    const jsonResponse = JSON.parse(extractedText);

    return res.json({
      success: true,
      data: jsonResponse
    } as ApiResponse<typeof jsonResponse>);

  } catch (error: any) {
    console.error('Error in OCR processing:', error);
    // Special handling for common OpenAI API errors
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: ' + error.message
      } as ApiResponse<null>);
    } else if (error.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Authentication error: ' + error.message
      } as ApiResponse<null>);
    }
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 