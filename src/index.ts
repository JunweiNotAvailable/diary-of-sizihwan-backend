import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';
import dataRoutes from './routes/data';
import authRoutes from './routes/auth';
import imageRoutes from './routes/image';

// Load environment variables
dotenv.config();

// Create Express server
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/chat', chatRoutes);
app.use('/data', dataRoutes);
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(port as number, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log routes
  console.log('Available routes:');
  console.log('- GET /: Health check');
  console.log('- POST /chat: Chat with AI');
  console.log('- GET|POST|PUT|DELETE /data: CRUD operations with database');
  console.log('- POST /auth/verify: Verify user credentials');
  console.log('- POST /auth/hash-password: Helper to hash passwords');
  console.log('- POST /image: OCR processing with AI');
}); 