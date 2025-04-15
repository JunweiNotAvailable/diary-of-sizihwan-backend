import { Router, Request, Response } from 'express';
import { query, ApiResponse } from '../db';
import bcrypt from 'bcrypt';

const router = Router();

interface VerifyRequest {
  id: string | number;
  password: string;
}

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

export default router; 