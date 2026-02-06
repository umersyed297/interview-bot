# Interview Bot Backend

Backend API for the AI Interview Bot using Google Gemini.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:
```
GEMINI_API_KEY=your_actual_key_here
PORT=3000
```

4. Get Gemini API key from: https://makersuite.google.com/app/apikey

## Run

Development mode (auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### POST /api/chat
Send a message and get AI response.

**Request:**
```json
{
  "message": "Hello, I'm ready for the interview",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Great! Let's begin. Can you tell me about yourself?",
  "sessionId": "session-id"
}
```

### POST /api/reset
Reset conversation history.

**Request:**
```json
{
  "sessionId": "optional-session-id"
}
```

### GET /health
Check if server is running.
