import { Router, Request, Response } from 'express';
import { query, ApiResponse } from '../db';

const router = Router();

// POST /translate - Translate text
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang || "auto",      // "auto" = detect automatically
          target: targetLang,      // e.g., "zh-TW", "ja", "es"
          format: "text",
        }),
      }
    );
    
    const data = await response.json();
    const translatedText = data.data.translations[0].translatedText;

    return res.json({
      success: true,
      data: { translatedText }
    } as ApiResponse<{ translatedText: string }>);
  } catch (error: any) {
    console.error('Error in translate:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router;