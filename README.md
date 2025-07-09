# Forex Advisor Backend

This is the backend service for the Forex Advisor application, providing API endpoints for chat, image analysis, and session management.

## Features

- Chat API with OpenAI integration for forex trading advice
- Image analysis for forex charts using OpenAI Vision API
- Session management for maintaining conversation history
- File upload handling for chart images
- Error handling and request validation

## Tech Stack

- Node.js
- Express.js
- TypeScript
- OpenAI API
- Multer (for file uploads)
- Express Session

## Directory Structure

```
/backend
├── src/
│   ├── controllers/      # Request controllers
│   ├── middlewares/      # Express middlewares
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions and types
│   └── index.ts          # Application entry point
├── .env.example          # Example environment variables
├── package.json          # Project dependencies
└── tsconfig.json         # TypeScript configuration
```

## Setup and Running

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies

```bash
npm install
# or
yarn install
```

4. Create a `.env` file based on `.env.example` and add your OpenAI API key

### Development

```bash
npm run dev
# or
yarn dev
```

### Production Build

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## API Endpoints

### Session Management

- `GET /api/session` - Get or create a new session
- `DELETE /api/session/:sessionId` - Clear session history

### Chat

- `POST /api/chat` - Send a message and get forex trading advice

Request body:
```json
{
  "message": "What's your analysis of the EUR/USD pair today?",
  "sessionId": "your-session-id"
}
```

### Image Upload and Analysis

- `POST /api/upload` - Upload a forex chart image for analysis

Multipart form data:
- `image`: The forex chart image file
- `sessionId`: The session ID
- `prompt` (optional): Custom prompt for analysis

## Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `OPENAI_API_KEY`: Your OpenAI API key
- `SESSION_SECRET`: Secret for session encryption
- `UPLOAD_DIR`: Directory for uploaded files (default: 'uploads')
- `MAX_UPLOAD_SIZE`: Maximum file upload size in MB (default: 10)