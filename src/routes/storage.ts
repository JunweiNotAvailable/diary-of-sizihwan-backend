import { Router, Request, Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../db';
import path from 'path';

// Extend the Express Request type to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const router = Router();

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// S3 bucket name
const bucketName = process.env.AWS_S3_BUCKET || '';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Filter file types (only allow images for now)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// Helper function to get file extension
const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

// Helper function to generate a unique filename
const generateUniqueFilename = (originalFilename: string): string => {
  const extension = getFileExtension(originalFilename);
  return `${uuidv4()}${extension}`;
};

// POST /storage/upload - Upload a file to S3
router.post('/upload', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      } as ApiResponse<null>);
    }

    // Get file details
    const file = req.file;
    const originalFilename = file.originalname;
    const uniqueFilename = generateUniqueFilename(originalFilename);
    
    // Folder structure (optional, can be specified in request)
    const folder = req.body.folder || '';
    
    // Full S3 key (path + filename)
    const s3Key = `${folder ? `${folder}/` : ''}${uniqueFilename}`;

    // Set up S3 upload parameters
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    // Upload to S3
    console.log(params);
    await s3Client.send(new PutObjectCommand(params));

    // Construct the full URL to the file
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    // Return success with file details
    return res.status(201).json({
      success: true,
      data: {
        filename: uniqueFilename,
        originalFilename,
        mimetype: file.mimetype,
        size: file.size,
        key: s3Key,
        url: fileUrl
      }
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

// DELETE /storage - Delete a file from S3
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'File key parameter is required'
      } as ApiResponse<null>);
    }

    // Set up S3 delete parameters
    const params = {
      Bucket: bucketName,
      Key: String(key)
    };

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand(params));

    // Return success
    return res.json({
      success: true,
      data: {
        key: String(key),
        message: 'File deleted successfully'
      }
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    } as ApiResponse<null>);
  }
});

export default router;
