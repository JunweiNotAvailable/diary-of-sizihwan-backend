# Diary of Sizihwan Server

A Node.js Express backend server that provides various API endpoints for data management, authentication, AI interactions, and more.

## Features

- RESTful API endpoints for CRUD operations
- Authentication and user management
- AI-powered question answering
- Image processing with OCR capabilities
- Translation services
- File storage with S3 integration
- Vector database integration with Qdrant
- Email functionality

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL (via Neon serverless)
- **Vector Database**: Qdrant
- **Storage**: AWS S3
- **Deployment**: Railway

## API Endpoints

- `GET /`: Health check
- `POST /ask`: Ask questions with AI
- `GET|POST|PUT|DELETE /data`: CRUD operations with database
- `POST /auth/verify`: Verify user credentials
- `POST /auth/hash-password`: Helper to hash passwords
- `POST /auth/send-code`: Send verification code via email
- `POST /auth/verify-code`: Verify email verification code
- `POST /image`: OCR processing with AI
- `POST /translate`: Translate text
- `POST /storage/upload`: Upload files to S3
- `DELETE /storage`: Delete files from S3
- `POST /embedding`: Embed text
- `POST /qdrant/store`: Store embedding in vector database
- `POST /qdrant/search`: Search for similar embeddings with scores
- `DELETE /qdrant/:id`: Delete an embedding
- `POST /email`: Send email

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database (or Neon serverless account)
- AWS S3 account (for file storage)
- Qdrant instance (for vector database)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/askhisyam-server.git
   cd askhisyam-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=your_postgres_connection_string
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   S3_BUCKET=your_s3_bucket_name
   QDRANT_URL=your_qdrant_url
   QDRANT_API_KEY=your_qdrant_api_key
   EMAIL_SERVICE=your_email_service
   EMAIL_USER=your_email_user
   EMAIL_PASS=your_email_password
   ```

4. Build the TypeScript code:
   ```
   npm run build
   ```

5. Start the server:
   ```
   npm start
   ```

## Development

- Run in development mode with hot reloading:
  ```
  npm run dev
  ```

- Run tests:
  ```
  npm test
  ```

## Deployment

This project is configured for deployment on Railway. The deployment process is automated through Railway's GitHub integration.

## Concurrency and Performance

The server is built on Node.js and Express, which use a non-blocking, event-driven architecture. This allows the server to handle hundreds of concurrent requests without blocking each other. Each request is processed independently through the event loop, and database operations run asynchronously.

## License

[MIT](LICENSE)

## Contact

For any questions or issues, please open an issue in the GitHub repository.
