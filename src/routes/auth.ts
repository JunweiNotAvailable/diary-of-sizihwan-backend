import { Router, Request, Response } from 'express';
import { query, ApiResponse } from '../db';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

interface VerifyRequest {
  id: string | number;
  password: string;
}

const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// POST /auth/verify - Verify user credentials
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { id, password } = req.body as VerifyRequest;
    
    if (!id || !password) {
      return res.status(400).json({
        success: false,
        error: 'ID and password are required'
      } as ApiResponse<null>);
    }

    // Get user from database by id
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>);
    }

    const user = result.rows[0];
    
    // Check if the hashed_password field exists in the user record
    if (!user.password) {
      return res.status(500).json({
        success: false,
        error: 'Password field not found in user record'
      } as ApiResponse<null>);
    }

    // Compare the password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as ApiResponse<null>);
    }
    
    return res.json({
      success: true,
      data: 'Successfully verified credentials'
    } as ApiResponse<string>);

  } catch (error: any) {
    console.error('Error in verifyCredentials:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// Helper route for hashing a password (useful for creating test users)
router.post('/hash-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      } as ApiResponse<null>);
    }

    // Generate salt and hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    return res.json({
      success: true,
      data: { hashedPassword }
    } as ApiResponse<{ hashedPassword: string }>);

  } catch (error: any) {
    console.error('Error in hashPassword:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// Helper function to generate a random 6-digit code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


// POST /auth/send-code - Generate and send verification code
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { email, name, language } = req.body as { email: string, name: string, language: string };
    
    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      } as ApiResponse<null>);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse<null>);
    }

    // Generate a random 6-digit code
    const verificationCode = generateVerificationCode();
    
    // Calculate expiration time (10 minutes from now)
    const expiresIn = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // Store the code in the database
    const id = `verification:${email}`;
    
    // Using the data insertion logic similar to the data route
    await query(
      `INSERT INTO keys (id, value, expires_in) VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO UPDATE SET value = $2, expires_in = $3`,
      [id, verificationCode, expiresIn]
    );

    // Create email content
    const emailData = {
      from: defaultFromEmail,
      to: email,
      subject: language === 'zh' ? '驗證你的學校信箱 - 西灣日記' : 'Verify your school email - Diary of Sizihwan',
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 24px; font-weight: bold; color: #333;">${language === 'zh' ? '驗證你的學校信箱' : 'Verify your school email'}</h1>
  </div>

  <div style="margin-bottom: 24px;">
    <p style="color: #555; margin-bottom: 16px;">Hello ${name},</p>
    <p style="color: #555;">${language === 'zh' ? '請使用以下驗證碼完成您的登入:' : 'Please use the following verification code to complete your login:'} <strong style="font-size: 20px;">${verificationCode}</strong></p>
  </div>

  <div style="margin-bottom: 24px;">
    <p style="color: #555; margin-bottom: 8px;">${language === 'zh' ? '此驗證碼將在 <strong>10 分鐘</strong> 後過期。' : 'This verification code will expire in <strong>10 minutes</strong>.'}</p>
    <p style="color: #555; margin-bottom: 16px;">${language === 'zh' ? '如果您未要求此驗證碼，可以安全地忽略此電子郵件。' : 'If you did not request this verification code, you can safely ignore this email.'}</p>
    <p style="color: #555;">${language === 'zh' ? '為了安全起見，請勿將此驗證碼分享給任何人。' : 'For your security, please do not share this verification code with anyone.'}</p>
  </div>

  <div style="border-top: 1px solid #eaeaea; margin: 24px 0;"></div>

  <div style="text-align: center; color: #999; font-size: 12px;">
    <p style="margin-bottom: 8px;">&copy; ${new Date().getFullYear()} Diary of Sizihwan</p>
  </div>
</div>
`
    };

    // Send the email
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Error sending verification email:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email: ' + error.message
      } as ApiResponse<null>);
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Verification code sent successfully',
        emailId: data?.id
      }
    } as ApiResponse<{ message: string, emailId?: string }>);

  } catch (error: any) {
    console.error('Error in sendVerificationCode:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// POST /auth/verify-code - Verify a code
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string, code: string };
    
    // Validate required fields
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required'
      } as ApiResponse<null>);
    }

    // Get the stored verification code
    const id = `verification:${email}`;
    const result = await query('SELECT * FROM keys WHERE id = $1', [id]);
    
    // Check if code exists
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verification code not found'
      } as ApiResponse<null>);
    }

    const storedData = result.rows[0];
    const storedCode = storedData.value;
    const expiresIn = new Date(storedData.expires_in);
    
    // Check if code has expired
    if (expiresIn < new Date()) {
      // Delete expired code
      await query('DELETE FROM keys WHERE id = $1', [id]);
      
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired'
      } as ApiResponse<null>);
    }

    // Verify the code
    if (code !== storedCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      } as ApiResponse<null>);
    }

    // Delete the code after successful verification
    await query('DELETE FROM keys WHERE id = $1', [id]);
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Email verification successful'
      }
    } as ApiResponse<{ message: string }>);

  } catch (error: any) {
    console.error('Error in verifyCode:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router;