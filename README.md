# Simple TypeScript Node.js Server

A streamlined Node.js server built with TypeScript, featuring routes for chat with OpenAI and CRUD operations with PostgreSQL.

## Features

- **Chat API**: Communicate with OpenAI's gpt-4o-mini model
  - Supports both streaming and non-streaming responses
- **Data API**: Perform CRUD operations on the database
  - Flexible querying with filtering, pagination, and ordering
  - Works with any existing PostgreSQL tables

## Project Structure

```
src/
├── index.ts       # Main server file
├── db.ts          # Database connection and utilities
└── routes/
    ├── chat.ts    # Chat route with OpenAI integration
    └── data.ts    # Data routes for CRUD operations
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgres://username:password@localhost:5432/database_name
```

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Start in development mode (with auto-reload)
npm run dev
```

## API Endpoints

### Chat API

- **POST /chat**
  - Request body:
    ```json
    {
      "message": "Your message to OpenAI",
      "stream": false  // Optional: Set to true for streaming response
    }
    ```

### Data API

- **GET /data?table=users&id=1**
  - Get a single item by ID
- **GET /data?table=users&query=name:John,email:john@example.com&limit=10&offset=0**
  - Get data with filters and pagination
- **POST /data?table=users**
  - Create a new item
- **PUT /data?table=users&id=1**
  - Update an existing item
- **DELETE /data?table=users&id=1**
  - Delete an item

## Important Note

This server assumes that the database tables already exist and does not create or define them. You must set up your database schema separately before using the API.

## Error Handling

All API endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
``` 