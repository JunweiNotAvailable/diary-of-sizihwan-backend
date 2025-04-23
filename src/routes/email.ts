import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { ApiResponse } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

// Default sender email address (can be overridden)
const defaultFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Email request interface
interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  from?: string;
  html?: boolean;
}

// POST /email - Send an email
router.post('/', async (req: Request, res: Response) => {
  try {
    const { to, subject, message, from, html = false } = req.body as EmailRequest;
    
    // Validate required fields
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email (to), subject, and message are required'
      } as ApiResponse<null>);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient email format'
      } as ApiResponse<null>);
    }

    // Prepare the email data based on whether it's HTML or plain text
    let emailData;
    if (html) {
      emailData = {
        from: from || defaultFromEmail,
        to,
        subject,
        html: message
      };
    } else {
      emailData = {
        from: from || defaultFromEmail,
        to,
        subject,
        text: message
      };
    }

    // Send the email using Resend
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send email: ' + error.message
      } as ApiResponse<null>);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: data?.id,
        message: 'Email sent successfully'
      }
    } as ApiResponse<{ id?: string; message: string }>);

  } catch (error: any) {
    console.error('Error in email route:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router; 