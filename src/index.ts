import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import askRoutes from './routes/ask.js';
import dataRoutes from './routes/data.js';
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/image.js';
import translateRoutes from './routes/translate.js';
import storageRoutes from './routes/storage.js';
import embeddingRoutes from './routes/embedding.js'; 
import qdrantRoutes from './routes/qdrant.js';
import emailRoutes from './routes/email.js';

// Load environment variables
dotenv.config();

// Create Express server
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


// Routes
app.use('/ask', askRoutes);
app.use('/data', dataRoutes);
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);
app.use('/translate', translateRoutes);
app.use('/storage', storageRoutes);
app.use('/embedding', embeddingRoutes);
app.use('/qdrant', qdrantRoutes);
app.use('/email', emailRoutes);

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
  console.log('- POST /ask: Ask with AI');
  console.log('- GET|POST|PUT|DELETE /data: CRUD operations with database');
  console.log('- POST /auth/verify: Verify user credentials');
  console.log('- POST /auth/hash-password: Helper to hash passwords');
  console.log('- POST /image: OCR processing with AI');
  console.log('- POST /translate: Translate text');
  console.log('- POST /storage/upload: Upload files to S3');
  console.log('- DELETE /storage: Delete files from S3');
  console.log('- POST /embedding: Embed text');
  console.log('- POST /qdrant/store: Store embedding in vector database');
  console.log('- POST /qdrant/search: Search for similar embeddings with scores');
  console.log('- DELETE /qdrant/:id: Delete an embedding');
  console.log('- POST /email: Send email');
}); 