import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://models.inference.ai.azure.com';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let geminiModel = null;
if (AI_PROVIDER === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.0-flash" });
}

// Middleware
app.use(cors());
app.use(express.json());

// Store conversation history and metadata per session
const conversationHistory = new Map();
const sessionData = new Map();

// Professional interviewer prompt (English only)
const SYSTEM_PROMPT = `You are a professional technical interview conductor. Your behavior:
1. Ask probing technical and behavioral questions to assess candidates
2. Be direct and professional - like a real interviewer, not a coach
3. Listen carefully and ask follow-up questions based on responses
4. Provide critical but constructive feedback
5. After EVERY answer, include a score marker at the very end: "SCORE|X/10" where X is 0-10
6. After 8-10 exchanges, conclude with: "INTERVIEW_COMPLETE|[score]/10|[passed]" (passed: true/false if score >= 6)
7. Keep responses to 1-2 sentences max for speech clarity
8. Ask about: background, technical skills, problem-solving, weaknesses, career goals
9. Challenge vague answers with "Can you elaborate?" or "Give me a specific example"

Start with: "Hello. I'm conducting your technical interview today. First, tell me about your professional background and key technical skills."
Make sure the SCORE marker is always present after your response.`;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Interview Bot API is running' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    const isStartMessage = message === '__start__';
    const isEndMessage = message === '__end__';
    const isTimeoutMessage = message === '__timeout__';
    console.log(`[${new Date().toISOString()}] 📨 Message from ${sessionId}: "${message}"`);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session data
    if (!sessionData.has(sessionId)) {
      sessionData.set(sessionId, {
        questionCount: 0,
        totalScore: 0,
        scoredCount: 0,
        startTime: new Date(),
        completed: false,
        finalScore: null
      });
    }

    const session = sessionData.get(sessionId);

    // Get or create conversation history for this session
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, [
        { role: 'system', content: SYSTEM_PROMPT },
      ]);
    }

    const history = conversationHistory.get(sessionId);

    const promptMessage = isStartMessage
      ? 'Start the interview now.'
      : isEndMessage
        ? 'End the interview now and provide final rating in the required format.'
        : isTimeoutMessage
          ? 'The candidate did not answer. Ask a new question now.'
          : message;
    const response = await generateResponse(promptMessage, history);
    console.log(`[${new Date().toISOString()}] 📤 Response to ${sessionId}: "${response}"`);

    // Update history
    if (!isStartMessage && !isEndMessage && !isTimeoutMessage) {
      history.push({ role: 'user', content: message });
    }
    history.push({ role: 'assistant', content: response });
    session.questionCount++;

    // Extract per-answer score marker (only for real answers)
    let cleanedResponse = response;
    const shouldScore = !isStartMessage && !isEndMessage && !isTimeoutMessage;
    const scoreMatch = response.match(/SCORE\|(\d{1,2})\/10/);
    if (scoreMatch) {
      if (shouldScore) {
        const score = Math.max(0, Math.min(10, parseInt(scoreMatch[1], 10)));
        session.totalScore += score;
        session.scoredCount += 1;
      }
      cleanedResponse = cleanedResponse.replace(/SCORE\|\d{1,2}\/10/, '').trim();
    }

    // Check if interview is complete
    let interviewComplete = false;
    let finalScore = null;
    let passed = false;

    if (response.includes('INTERVIEW_COMPLETE|')) {
      interviewComplete = true;
      const match = response.match(/INTERVIEW_COMPLETE\|(\d+\/10)\|(\w+)/);
      if (match) {
        const avg = session.scoredCount > 0
          ? Math.round((session.totalScore / session.scoredCount) * 10) / 10
          : 0;
        finalScore = `${avg}/10`;
        passed = avg >= 6;
        session.completed = true;
        session.finalScore = finalScore;
        // Remove the completion marker from response
        const withoutCompletion = cleanedResponse.replace(/INTERVIEW_COMPLETE\|[\d/]+\|[a-z]+/, '').trim();
        const closingMessage = withoutCompletion || 'The interview is complete. Thank you.';
        res.json({
          success: true,
          response: closingMessage,
          sessionId: sessionId,
          interviewComplete: true,
          finalScore: finalScore,
          passed: passed
        });
        console.log(`✅ Interview completed for ${sessionId}: ${finalScore} - ${passed ? 'PASSED' : 'FAILED'}`);
        return;
      }
    }

    res.json({
      success: true,
      response: cleanedResponse,
      sessionId: sessionId,
      interviewComplete: false

    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in /api/chat:`, error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
});

// Reset conversation endpoint
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversationHistory.delete(sessionId);
  sessionData.delete(sessionId);
  res.json({ success: true, message: 'Conversation reset' });
});

// Get session stats
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionData.get(sessionId);
  
  if (!session) {
    return res.json({
      status: 'not_found',
      message: 'Session does not exist'
    });
  }

  res.json({
    status: 'ok',
    sessionId,
    ...session,
    durationSeconds: Math.floor((new Date() - session.startTime) / 1000)
  });
});


// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Interview Bot API running on http://localhost:${PORT}`);
  console.log(`📱 Mobile app should connect to: http://YOUR_IP_ADDRESS:${PORT}`);
  console.log(`🤖 AI Provider: ${AI_PROVIDER}`);

  if (AI_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.warn('⚠️  WARNING: GEMINI_API_KEY not set in .env file');
  }

  if (AI_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set in .env file');
  }
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📛 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n📛 Shutting down gracefully (SIGTERM)...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

async function generateResponse(message, history) {
  if (AI_PROVIDER === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    const messages = [...history, { role: 'user', content: message }];

    // Add timeout to API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages,
          max_tokens: 200,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI-compatible API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('OpenAI-compatible API returned empty response');
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('API request timeout (30s)');
      }
      throw error;
    }
  }

  if (!geminiModel) {
    throw new Error('Gemini model not initialized');
  }

  const geminiHistory = history.map((item) => {
    if (item.role === 'assistant') {
      return { role: 'model', parts: [{ text: item.content }] };
    }
    return { role: 'user', parts: [{ text: item.content }] };
  });

  const chat = geminiModel.startChat({
    history: geminiHistory,
    generationConfig: {
      maxOutputTokens: 200,
      temperature: 0.7,
    },
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}
