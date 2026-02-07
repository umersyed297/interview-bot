/**
 * Interview Bot API Server (v2.0)
 * ================================
 * Production-grade backend with integrated modules:
 * - Evaluation Engine: Multi-dimensional answer scoring
 * - Adaptive Difficulty: Dynamic question difficulty adjustment
 * - Feedback Engine: Recruiter-style feedback generation
 * - Persistent Storage: JSON file-based performance history
 * - Analytics: Dashboard-ready statistics APIs
 * - Anti-Cheat: Suspicious pattern detection
 * - Skill Gap Detection: Knowledge gap identification
 * - Resume Parsing: Resume-based interview customization
 * 
 * @author Syed Umer
 * @version 2.0.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Module Imports ───
import { AdaptiveDifficultyManager } from './modules/adaptive.js';
import { getCandidateAnalytics, getDashboardAnalytics, getSuccessRateAnalytics } from './modules/analytics.js';
import { AntiCheatMonitor } from './modules/anti-cheat.js';
import { evaluateAnswer } from './modules/evaluation.js';
import { generateFeedbackReport, generateSpokenSummary } from './modules/feedback.js';
import { generateResumeBasedPrompt, parseResume } from './modules/resume.js';
import { SkillGapDetector } from './modules/skill-gap.js';
import {
    getCandidate,
    getCandidateSessions,
    getImprovementRate,
    getScoreProgression,
    getSession,
    saveSession,
    updateCandidateProfile,
} from './modules/storage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Multer Config for Resume Uploads ───
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|doc|docx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, DOC, DOCX files are allowed'));
    }
  },
});

// ─── In-Memory Resume Store (sessionId → resumeText) ───
const pendingResumes = new Map();

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://models.inference.ai.azure.com';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let geminiModel = null;
if (AI_PROVIDER === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Increased for resume uploads

// ─── In-Memory Session State ───
const conversationHistory = new Map();
const sessionData = new Map();

// ─── System Prompt (Enhanced with Adaptive Support) ───

const BASE_SYSTEM_PROMPT = `You are a professional technical interview conductor. Your behavior:
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

/**
 * Build dynamic system prompt with adaptive difficulty and resume context
 */
function buildSystemPrompt(session) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (session.adaptiveManager) {
    const config = session.adaptiveManager.getNextQuestionConfig();
    session._lastQuestionConfig = config;
    prompt += `\n\nDIFFICULTY INSTRUCTION: ${config.prompt}`;
    prompt += `\nCurrent difficulty level: ${config.difficultyName} (${config.difficulty}/3)`;
    if (config.isFollowUp) {
      prompt += `\nThis should be a FOLLOW-UP question based on the candidate's previous answer.`;
    }
  }

  if (session.domainPrompt) {
    prompt += `\n\n${session.domainPrompt}`;
  }

  if (session.resumePrompt) {
    prompt += `\n\n${session.resumePrompt}`;
  }

  return prompt;
}

// ═══════════════════════════════════════════
// ██  CORE ENDPOINTS
// ═══════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    modules: ['evaluation', 'adaptive', 'feedback', 'storage', 'analytics', 'anti-cheat', 'skill-gap', 'resume'],
  });
});

// ─── Main Chat Endpoint ───
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default', candidateId = 'anonymous', resumeText, domain } = req.body;
    const isStartMessage = message === '__start__';
    const isEndMessage = message === '__end__';
    const isTimeoutMessage = message === '__timeout__';
    console.log(`[${new Date().toISOString()}] 📨 ${sessionId}: "${message}"${resumeText ? ' [with resume]' : ''}${domain ? ` [domain: ${domain}]` : ''}`);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize session
    if (!sessionData.has(sessionId)) {
      sessionData.set(sessionId, {
        questionCount: 0,
        totalScore: 0,
        scoredCount: 0,
        startTime: new Date(),
        completed: false,
        finalScore: null,
        candidateId,
        adaptiveManager: new AdaptiveDifficultyManager({ startLevel: 1 }),
        antiCheat: new AntiCheatMonitor(),
        skillGap: new SkillGapDetector('mid'),
        answerEvaluations: [],
        questionAnswerPairs: [],
        resumePrompt: null,
        _lastQuestionConfig: null,
      });
    }

    const session = sessionData.get(sessionId);

    // Apply resume context if provided (on __start__ or standalone)
    const effectiveResumeText = resumeText || pendingResumes.get(sessionId);
    if (effectiveResumeText && isStartMessage) {
      const parsed = parseResume(effectiveResumeText);
      const promptData = generateResumeBasedPrompt(parsed);
      session.resumePrompt = promptData.systemPromptAddition;
      if (promptData.difficultyOverride) {
        session.adaptiveManager.currentLevel = promptData.difficultyOverride;
      }
      if (promptData.experienceLevel) {
        session.skillGap = new SkillGapDetector(promptData.experienceLevel);
      }
      session.resumeParsed = parsed;
      pendingResumes.delete(sessionId);
      console.log(`[${sessionId}] 📄 Resume applied: ${parsed.skills.count} skills, ${parsed.experienceLevel} level`);
    }

    // Apply domain context if provided
    if (domain && domain !== 'general' && isStartMessage) {
      session.domain = domain;
      session.domainPrompt = `\nINTERVIEW DOMAIN: ${domain}\nFocus ALL questions specifically on ${domain}. Ask technical and role-specific questions relevant to a ${domain} position. Tailor difficulty, terminology, and scenarios to this domain.`;
      console.log(`[${sessionId}] 🎯 Domain set: ${domain}`);
    }

    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, [
        { role: 'system', content: buildSystemPrompt(session) },
      ]);
    }

    const history = conversationHistory.get(sessionId);

    // Always rebuild system prompt (includes domain, resume, and adaptive difficulty)
    history[0] = { role: 'system', content: buildSystemPrompt(session) };

    const promptMessage = isStartMessage
      ? 'Start the interview now.'
      : isEndMessage
        ? 'End the interview now and provide final rating in the required format.'
        : isTimeoutMessage
          ? 'The candidate did not answer. Ask a new question now.'
          : message;

    // Anti-cheat: mark question time
    if (!isStartMessage) {
      session.antiCheat.questionAsked();
    }

    const response = await generateResponse(promptMessage, history);
    console.log(`[${new Date().toISOString()}] 📤 ${sessionId}: "${response}"`);

    // Update history
    if (!isStartMessage && !isEndMessage && !isTimeoutMessage) {
      history.push({ role: 'user', content: message });
    }
    history.push({ role: 'assistant', content: response });
    session.questionCount++;

    // Extract AI score
    let cleanedResponse = response;
    const shouldScore = !isStartMessage && !isEndMessage && !isTimeoutMessage;
    const scoreMatch = response.match(/SCORE\|(\d{1,2})\/10/);
    let aiScore = 0;

    if (scoreMatch) {
      aiScore = Math.max(0, Math.min(10, parseInt(scoreMatch[1], 10)));
      if (shouldScore) {
        session.totalScore += aiScore;
        session.scoredCount += 1;
      }
      cleanedResponse = cleanedResponse.replace(/SCORE\|\d{1,2}\/10/, '').trim();
    }

    // Run evaluation modules on real answers
    let answerEvaluation = null;
    let antiCheatResult = null;

    if (shouldScore) {
      const lastQuestion = getLastQuestion(history);

      answerEvaluation = evaluateAnswer(message, lastQuestion, aiScore);
      session.answerEvaluations.push(answerEvaluation);

      session.questionAnswerPairs.push({
        question: lastQuestion,
        answer: message,
        aiScore,
        compositeScore: answerEvaluation.compositeScore,
        timestamp: new Date().toISOString(),
      });

      session.adaptiveManager.recordScore(answerEvaluation.compositeScore);
      session.adaptiveManager.shouldFollowUp(answerEvaluation.compositeScore, lastQuestion, message);

      antiCheatResult = session.antiCheat.analyzeAnswer(message, aiScore);

      const questionType = session._lastQuestionConfig?.questionType || 'technical';
      session.skillGap.trackAnswer(lastQuestion, message, answerEvaluation.compositeScore, questionType);

      console.log(`[${sessionId}] 📊 Composite: ${answerEvaluation.compositeScore}/10 | Level: ${session.adaptiveManager.currentLevel} | Suspicion: ${antiCheatResult.overallSuspicionScore}`);
    }

    // Check interview completion
    if (response.includes('INTERVIEW_COMPLETE|')) {
      const match = response.match(/INTERVIEW_COMPLETE\|(\d+\/10)\|(\w+)/);
      if (match) {
        const avg = session.scoredCount > 0
          ? Math.round((session.totalScore / session.scoredCount) * 10) / 10
          : 0;
        const passed = avg >= 6;
        session.completed = true;
        session.finalScore = avg;

        const feedbackReport = generateFeedbackReport({
          finalScore: avg,
          passed,
          answerEvaluations: session.answerEvaluations,
          adaptiveState: session.adaptiveManager.getState(),
          skillGaps: session.skillGap.getAnalysis(),
          duration: Math.floor((new Date() - session.startTime) / 1000),
          questionCount: session.questionCount,
        });

        const integrityReport = session.antiCheat.getIntegrityReport();
        const spokenSummary = generateSpokenSummary(feedbackReport);

        // Persist
        saveSession(sessionId, {
          sessionId,
          candidateId: session.candidateId,
          finalScore: avg,
          passed,
          questionCount: session.questionCount,
          duration: Math.floor((new Date() - session.startTime) / 1000),
          feedbackReport,
          integrityReport,
          skillGaps: session.skillGap.getAnalysis(),
          adaptiveState: session.adaptiveManager.serialize(),
          questionAnswerPairs: session.questionAnswerPairs,
        });
        updateCandidateProfile(session.candidateId, {
          finalScore: avg,
          passed,
          skillGaps: session.skillGap.getAnalysis(),
        });

        const withoutCompletion = cleanedResponse.replace(/INTERVIEW_COMPLETE\|[\d./]+\|[a-z]+/i, '').trim();

        console.log(`✅ Completed ${sessionId}: ${avg}/10 - ${passed ? 'PASSED' : 'FAILED'}`);

        return res.json({
          success: true,
          response: withoutCompletion || 'The interview is complete. Thank you.',
          sessionId,
          interviewComplete: true,
          finalScore: `${avg}/10`,
          passed,
          feedbackReport,
          integrityReport,
          spokenSummary,
        });
      }
    }

    res.json({
      success: true,
      response: cleanedResponse,
      sessionId,
      interviewComplete: false,
      answerMeta: shouldScore && answerEvaluation ? {
        compositeScore: answerEvaluation.compositeScore,
        aiScore,
        difficultyLevel: session.adaptiveManager.currentLevel,
        suspicionLevel: antiCheatResult?.suspicionLevel || 'clean',
      } : null,
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to process request', details: error.message });
  }
});

// ═══════════════════════════════════════════
// ██  SESSION MANAGEMENT
// ═══════════════════════════════════════════

app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversationHistory.delete(sessionId);
  sessionData.delete(sessionId);
  res.json({ success: true, message: 'Conversation reset' });
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionData.get(sessionId);

  if (!session) {
    const stored = getSession(sessionId);
    if (stored) return res.json({ status: 'completed', ...stored });
    return res.json({ status: 'not_found' });
  }

  res.json({
    status: session.completed ? 'completed' : 'in_progress',
    sessionId,
    questionCount: session.questionCount,
    scoredCount: session.scoredCount,
    durationSeconds: Math.floor((new Date() - session.startTime) / 1000),
    adaptiveState: session.adaptiveManager.getState(),
    skillGaps: session.skillGap.getAnalysis(),
    integrity: session.antiCheat.getIntegrityReport(),
  });
});

app.get('/api/session/:sessionId/feedback', (req, res) => {
  const { sessionId } = req.params;
  const stored = getSession(sessionId);
  if (stored?.feedbackReport) {
    return res.json({ success: true, feedback: stored.feedbackReport });
  }

  const session = sessionData.get(sessionId);
  if (!session || !session.completed) {
    return res.json({ success: false, error: 'No feedback available' });
  }

  const report = generateFeedbackReport({
    finalScore: session.finalScore,
    passed: session.finalScore >= 6,
    answerEvaluations: session.answerEvaluations,
    adaptiveState: session.adaptiveManager.getState(),
    skillGaps: session.skillGap.getAnalysis(),
    duration: Math.floor((new Date() - session.startTime) / 1000),
    questionCount: session.questionCount,
  });

  res.json({ success: true, feedback: report });
});

// ═══════════════════════════════════════════
// ██  RESUME ENDPOINTS
// ═══════════════════════════════════════════

// Text-based resume parsing (legacy)
app.post('/api/resume', (req, res) => {
  try {
    const { resumeText, sessionId = 'default' } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });

    const parsed = parseResume(resumeText);
    const promptData = generateResumeBasedPrompt(parsed);

    // Store for later use when interview starts
    pendingResumes.set(sessionId, resumeText);

    if (sessionData.has(sessionId)) {
      const session = sessionData.get(sessionId);
      session.resumePrompt = promptData.systemPromptAddition;
      if (promptData.difficultyOverride) {
        session.adaptiveManager.currentLevel = promptData.difficultyOverride;
      }
      if (promptData.experienceLevel) {
        session.skillGap = new SkillGapDetector(promptData.experienceLevel);
      }
    }

    res.json({
      success: true,
      parsed,
      suggestedTopics: promptData.suggestedTopics,
      experienceLevel: promptData.experienceLevel,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File upload resume parsing (PDF, TXT, DOC)
app.post('/api/resume/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Send a file with field name "resume".' });
    }

    const { sessionId = 'default' } = req.body;
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;

    console.log(`[${new Date().toISOString()}] 📄 Resume upload: ${originalName} (${mimeType})`);

    let resumeText = '';

    try {
      if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
        // Parse PDF using pdf-parse v1 (CJS module)
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        resumeText = pdfData.text;
      } else {
        // Plain text / DOC fallback (read as text)
        resumeText = fs.readFileSync(filePath, 'utf-8');
      }
    } finally {
      // Clean up uploaded file
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Could not extract text from the file. Try a different format.' });
    }

    const parsed = parseResume(resumeText);
    const promptData = generateResumeBasedPrompt(parsed);

    // Store resume text for when the interview session starts
    pendingResumes.set(sessionId, resumeText);

    console.log(`[${sessionId}] 📄 Resume parsed: ${parsed.skills.count} skills | ${parsed.experienceLevel} level | ${parsed.expertise.length} expertise areas`);

    res.json({
      success: true,
      fileName: originalName,
      parsed,
      suggestedTopics: promptData.suggestedTopics,
      experienceLevel: promptData.experienceLevel || parsed.experienceLevel,
      summary: {
        totalSkills: parsed.skills.count,
        topSkills: parsed.skills.all.slice(0, 8),
        experienceLevel: parsed.experienceLevel,
        estimatedYears: parsed.estimatedYears,
        topExpertise: parsed.expertise.map(e => e.area),
        education: parsed.education,
        achievements: parsed.achievements,
        candidateName: parsed.candidateName || '',
      },
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    // Clean up file on error
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.status(500).json({ success: false, error: error.message || 'Failed to process resume' });
  }
});

// ═══════════════════════════════════════════
// ██  PERFORMANCE HISTORY
// ═══════════════════════════════════════════

app.get('/api/candidate/:candidateId', (req, res) => {
  const candidate = getCandidate(req.params.candidateId);
  const sessions = getCandidateSessions(req.params.candidateId);
  const progression = getScoreProgression(req.params.candidateId);
  const improvement = getImprovementRate(req.params.candidateId);

  res.json({ success: true, candidate, sessions: sessions.slice(0, 20), scoreProgression: progression, improvement });
});

app.get('/api/candidate/:candidateId/history', (req, res) => {
  const sessions = getCandidateSessions(req.params.candidateId);
  res.json({
    success: true,
    total: sessions.length,
    sessions: sessions.map(s => ({
      sessionId: s.id, date: s.savedAt, score: s.finalScore, passed: s.passed,
      questionCount: s.questionCount, duration: s.duration,
    })),
  });
});

// ═══════════════════════════════════════════
// ██  ANALYTICS
// ═══════════════════════════════════════════

app.get('/api/analytics/dashboard', (req, res) => {
  try {
    res.json({ success: true, ...getDashboardAnalytics() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/analytics/candidate/:candidateId', (req, res) => {
  try {
    const analytics = getCandidateAnalytics(req.params.candidateId);
    if (!analytics) return res.json({ success: false, error: 'Candidate not found' });
    res.json({ success: true, ...analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/analytics/success-rate', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    res.json({ success: true, ...getSuccessRateAnalytics(days) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════
// ██  UTILITY
// ═══════════════════════════════════════════

function getLastQuestion(history) {
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].role === 'assistant') return history[i].content;
  }
  return '';
}

async function generateResponse(message, history) {
  if (AI_PROVIDER === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is missing');

    const messages = [...history, { role: 'user', content: message }];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens: 200, temperature: 0.7 }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('API returned empty response');
      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') throw new Error('API request timeout (30s)');
      throw error;
    }
  }

  if (!geminiModel) throw new Error('Gemini model not initialized');

  const geminiHistory = history.map((item) => {
    if (item.role === 'assistant') return { role: 'model', parts: [{ text: item.content }] };
    return { role: 'user', parts: [{ text: item.content }] };
  });

  const chat = geminiModel.startChat({
    history: geminiHistory,
    generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}

// ═══════════════════════════════════════════
// ██  SERVER STARTUP
// ═══════════════════════════════════════════

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Interview Bot API v2.0 on http://localhost:${PORT}`);
  console.log(`🤖 AI: ${AI_PROVIDER} | 📦 8 modules loaded | 💾 data/`);
});

server.on('error', (err) => { console.error('Server error:', err); process.exit(1); });
process.on('SIGINT', () => { console.log('\n📛 Shutting down...'); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('uncaughtException', (err) => { console.error('❌ Uncaught:', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('❌ Unhandled rejection:', reason); });
