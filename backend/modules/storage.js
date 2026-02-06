/**
 * Persistent Storage Module
 * =========================
 * File-based JSON storage for interview performance history.
 * Uses atomic writes with temp files for data safety.
 * Supports candidate profiles, interview sessions, and analytics queries.
 * 
 * Storage structure:
 *   data/
 *     candidates.json    - Candidate profiles
 *     sessions.json      - Interview session records
 *     analytics-cache.json - Pre-computed analytics
 * 
 * @module storage
 * @author Syed Umer
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// ─── File Paths ───

const FILES = {
  candidates: join(DATA_DIR, 'candidates.json'),
  sessions: join(DATA_DIR, 'sessions.json'),
  analyticsCache: join(DATA_DIR, 'analytics-cache.json'),
};

// ─── Low-Level File Operations ───

/**
 * Read a JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist
 * @returns {*} Parsed JSON content
 */
function readJSON(filePath, defaultValue = {}) {
  try {
    if (!existsSync(filePath)) return defaultValue;
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[Storage] Error reading ${filePath}:`, error.message);
    return defaultValue;
  }
}

/**
 * Write JSON file atomically (write to temp, then rename)
 * @param {string} filePath - Path to JSON file
 * @param {*} data - Data to serialize
 */
function writeJSON(filePath, data) {
  try {
    const tempPath = filePath + '.tmp';
    writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tempPath, filePath);
  } catch (error) {
    console.error(`[Storage] Error writing ${filePath}:`, error.message);
    // Fallback: try direct write
    try {
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error(`[Storage] Fallback write also failed:`, e.message);
    }
  }
}

// ─── Candidate Operations ───

/**
 * Get or create a candidate profile
 * @param {string} candidateId - Unique candidate identifier
 * @param {string} name - Candidate name (used on creation)
 * @returns {Object} Candidate profile
 */
export function getCandidate(candidateId, name = 'Anonymous') {
  const candidates = readJSON(FILES.candidates, {});
  
  if (!candidates[candidateId]) {
    candidates[candidateId] = {
      id: candidateId,
      name,
      createdAt: new Date().toISOString(),
      totalInterviews: 0,
      averageScore: 0,
      bestScore: 0,
      passRate: 0,
      totalPassed: 0,
      skillProfile: {},
      lastInterviewAt: null,
    };
    writeJSON(FILES.candidates, candidates);
  }

  return candidates[candidateId];
}

/**
 * Update candidate profile after an interview
 * @param {string} candidateId - Candidate ID
 * @param {Object} sessionSummary - Session summary data
 */
export function updateCandidateProfile(candidateId, sessionSummary) {
  const candidates = readJSON(FILES.candidates, {});
  const candidate = candidates[candidateId] || getCandidate(candidateId);

  candidate.totalInterviews += 1;
  candidate.lastInterviewAt = new Date().toISOString();

  // Update scores
  const { finalScore, passed, skillGaps } = sessionSummary;
  candidate.bestScore = Math.max(candidate.bestScore, finalScore);
  if (passed) candidate.totalPassed += 1;
  candidate.passRate = Math.round((candidate.totalPassed / candidate.totalInterviews) * 100);

  // Running average
  candidate.averageScore = Math.round(
    ((candidate.averageScore * (candidate.totalInterviews - 1)) + finalScore) / candidate.totalInterviews * 10
  ) / 10;

  // Update skill profile from gaps
  if (skillGaps?.topicScores) {
    for (const [topic, score] of Object.entries(skillGaps.topicScores)) {
      if (!candidate.skillProfile[topic]) {
        candidate.skillProfile[topic] = { scores: [], average: 0 };
      }
      candidate.skillProfile[topic].scores.push(score);
      const scores = candidate.skillProfile[topic].scores;
      candidate.skillProfile[topic].average = 
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
  }

  candidates[candidateId] = candidate;
  writeJSON(FILES.candidates, candidates);
  return candidate;
}

/**
 * Get all candidates
 * @returns {Object} All candidate profiles
 */
export function getAllCandidates() {
  return readJSON(FILES.candidates, {});
}

// ─── Session Operations ───

/**
 * Save a complete interview session
 * @param {string} sessionId - Session identifier
 * @param {Object} sessionData - Complete session data
 * @returns {Object} Saved session
 */
export function saveSession(sessionId, sessionData) {
  const sessions = readJSON(FILES.sessions, {});

  sessions[sessionId] = {
    id: sessionId,
    savedAt: new Date().toISOString(),
    ...sessionData,
  };

  writeJSON(FILES.sessions, sessions);
  return sessions[sessionId];
}

/**
 * Get a specific session
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Session data or null
 */
export function getSession(sessionId) {
  const sessions = readJSON(FILES.sessions, {});
  return sessions[sessionId] || null;
}

/**
 * Get all sessions for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Array of sessions sorted by date (newest first)
 */
export function getCandidateSessions(candidateId) {
  const sessions = readJSON(FILES.sessions, {});
  return Object.values(sessions)
    .filter(s => s.candidateId === candidateId)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

/**
 * Get recent sessions (across all candidates)
 * @param {number} limit - Maximum sessions to return
 * @returns {Array} Recent sessions
 */
export function getRecentSessions(limit = 20) {
  const sessions = readJSON(FILES.sessions, {});
  return Object.values(sessions)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, limit);
}

/**
 * Get total session count
 * @returns {number}
 */
export function getSessionCount() {
  const sessions = readJSON(FILES.sessions, {});
  return Object.keys(sessions).length;
}

// ─── Analytics Cache ───

/**
 * Cache analytics computation results
 * @param {string} key - Cache key
 * @param {*} data - Data to cache
 * @param {number} ttlMs - Time-to-live in milliseconds (default 5 minutes)
 */
export function cacheAnalytics(key, data, ttlMs = 5 * 60 * 1000) {
  const cache = readJSON(FILES.analyticsCache, {});
  cache[key] = {
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  writeJSON(FILES.analyticsCache, cache);
}

/**
 * Get cached analytics if not expired
 * @param {string} key - Cache key
 * @returns {*|null} Cached data or null if expired/missing
 */
export function getCachedAnalytics(key) {
  const cache = readJSON(FILES.analyticsCache, {});
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.data;
}

// ─── Performance History Queries ───

/**
 * Get score progression for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Array} Score progression array
 */
export function getScoreProgression(candidateId) {
  const sessions = getCandidateSessions(candidateId);
  return sessions.reverse().map((s, i) => ({
    interviewNumber: i + 1,
    date: s.savedAt,
    score: s.finalScore || 0,
    passed: s.passed || false,
    difficulty: s.adaptiveState?.currentLevel || 1,
    questionCount: s.questionCount || 0,
  }));
}

/**
 * Get improvement rate for a candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Object} Improvement statistics
 */
export function getImprovementRate(candidateId) {
  const progression = getScoreProgression(candidateId);
  if (progression.length < 2) {
    return { rate: 0, trend: 'insufficient_data', sessions: progression.length };
  }

  // Compare first half average to second half average
  const mid = Math.floor(progression.length / 2);
  const firstHalf = progression.slice(0, mid);
  const secondHalf = progression.slice(mid);

  const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

  const rate = Math.round((secondAvg - firstAvg) * 10) / 10;
  let trend = 'stable';
  if (rate > 0.5) trend = 'improving';
  else if (rate < -0.5) trend = 'declining';

  return {
    rate,
    trend,
    sessions: progression.length,
    firstHalfAvg: Math.round(firstAvg * 10) / 10,
    secondHalfAvg: Math.round(secondAvg * 10) / 10,
  };
}

export default {
  getCandidate,
  updateCandidateProfile,
  getAllCandidates,
  saveSession,
  getSession,
  getCandidateSessions,
  getRecentSessions,
  getSessionCount,
  cacheAnalytics,
  getCachedAnalytics,
  getScoreProgression,
  getImprovementRate,
};
