/**
 * Analytics Module
 * ================
 * Provides dashboard-ready analytics APIs:
 * - Candidate statistics
 * - Success rates and trends
 * - Common skill weaknesses across all candidates
 * - Interview volume and patterns
 * - Difficulty distribution
 * 
 * @module analytics
 * @author Syed Umer
 */

import {
    cacheAnalytics,
    getAllCandidates,
    getCachedAnalytics,
    getImprovementRate,
    getRecentSessions,
    getScoreProgression,
    getSessionCount,
} from './storage.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

/**
 * Get overall platform analytics dashboard data
 * @returns {Object} Dashboard analytics
 */
export function getDashboardAnalytics() {
  // Check cache first
  const cached = getCachedAnalytics('dashboard');
  if (cached) return cached;

  const candidates = getAllCandidates();
  const candidateList = Object.values(candidates);
  const totalSessions = getSessionCount();
  const recentSessions = getRecentSessions(100);

  // ── Overall Stats ──
  const totalCandidates = candidateList.length;
  const avgScore = candidateList.length > 0
    ? Math.round((candidateList.reduce((sum, c) => sum + c.averageScore, 0) / candidateList.length) * 10) / 10
    : 0;
  const overallPassRate = candidateList.length > 0
    ? Math.round((candidateList.reduce((sum, c) => sum + c.passRate, 0) / candidateList.length))
    : 0;

  // ── Score Distribution ──
  const scoreDistribution = { '0-2': 0, '3-4': 0, '5-6': 0, '7-8': 0, '9-10': 0 };
  for (const session of recentSessions) {
    const score = session.finalScore || 0;
    if (score <= 2) scoreDistribution['0-2']++;
    else if (score <= 4) scoreDistribution['3-4']++;
    else if (score <= 6) scoreDistribution['5-6']++;
    else if (score <= 8) scoreDistribution['7-8']++;
    else scoreDistribution['9-10']++;
  }

  // ── Common Weaknesses ──
  const weaknessCounts = {};
  for (const session of recentSessions) {
    if (session.feedbackReport?.improvements) {
      for (const imp of session.feedbackReport.improvements) {
        weaknessCounts[imp.text] = (weaknessCounts[imp.text] || 0) + 1;
      }
    }
  }
  const commonWeaknesses = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([weakness, count]) => ({ weakness, count, percentage: Math.round((count / Math.max(recentSessions.length, 1)) * 100) }));

  // ── Skill Gap Frequency ──
  const skillGapCounts = {};
  for (const session of recentSessions) {
    if (session.skillGaps?.gaps) {
      for (const gap of session.skillGaps.gaps) {
        skillGapCounts[gap.topic] = (skillGapCounts[gap.topic] || 0) + 1;
      }
    }
  }
  const commonSkillGaps = Object.entries(skillGapCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count, percentage: Math.round((count / Math.max(recentSessions.length, 1)) * 100) }));

  // ── Difficulty Distribution ──
  const difficultyDist = { easy: 0, medium: 0, hard: 0 };
  for (const session of recentSessions) {
    const level = session.adaptiveState?.currentLevel || 1;
    if (level === 1) difficultyDist.easy++;
    else if (level === 2) difficultyDist.medium++;
    else difficultyDist.hard++;
  }

  // ── Recent Activity (last 7 days) ──
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentActivity = recentSessions.filter(s => new Date(s.savedAt).getTime() > sevenDaysAgo);

  // ── Top Performers ──
  const topPerformers = candidateList
    .filter(c => c.totalInterviews >= 2)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      averageScore: c.averageScore,
      totalInterviews: c.totalInterviews,
      passRate: c.passRate,
    }));

  const dashboard = {
    overview: {
      totalCandidates,
      totalSessions,
      averageScore: avgScore,
      overallPassRate,
      recentActivityCount: recentActivity.length,
    },
    scoreDistribution,
    commonWeaknesses,
    commonSkillGaps,
    difficultyDistribution: difficultyDist,
    topPerformers,
    generatedAt: new Date().toISOString(),
  };

  cacheAnalytics('dashboard', dashboard, CACHE_TTL);
  return dashboard;
}

/**
 * Get detailed analytics for a specific candidate
 * @param {string} candidateId - Candidate ID
 * @returns {Object} Candidate analytics
 */
export function getCandidateAnalytics(candidateId) {
  const cacheKey = `candidate_${candidateId}`;
  const cached = getCachedAnalytics(cacheKey);
  if (cached) return cached;

  const candidates = getAllCandidates();
  const candidate = candidates[candidateId];
  if (!candidate) return null;

  const progression = getScoreProgression(candidateId);
  const improvement = getImprovementRate(candidateId);

  // Skill strengths and gaps
  const skills = Object.entries(candidate.skillProfile || {})
    .map(([topic, data]) => ({
      topic,
      averageScore: data.average,
      attempts: data.scores.length,
      trend: data.scores.length >= 2
        ? data.scores[data.scores.length - 1] > data.scores[0] ? 'improving' : 'declining'
        : 'insufficient_data',
    }))
    .sort((a, b) => a.averageScore - b.averageScore);

  const analytics = {
    profile: candidate,
    scoreProgression: progression,
    improvement,
    skillBreakdown: skills,
    strengths: skills.filter(s => s.averageScore >= 7),
    weaknesses: skills.filter(s => s.averageScore < 5),
    consistency: calculateConsistency(progression.map(p => p.score)),
    generatedAt: new Date().toISOString(),
  };

  cacheAnalytics(cacheKey, analytics, CACHE_TTL);
  return analytics;
}

/**
 * Get success rate analytics over time
 * @param {number} days - Number of days to look back
 * @returns {Object} Success rate data
 */
export function getSuccessRateAnalytics(days = 30) {
  const sessions = getRecentSessions(500);
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const filtered = sessions.filter(s => new Date(s.savedAt).getTime() > cutoff);

  if (filtered.length === 0) {
    return { period: days, totalSessions: 0, passRate: 0, avgScore: 0, dailyBreakdown: {} };
  }

  const totalPassed = filtered.filter(s => s.passed).length;
  const avgScore = Math.round((filtered.reduce((sum, s) => sum + (s.finalScore || 0), 0) / filtered.length) * 10) / 10;

  // Daily breakdown
  const dailyBreakdown = {};
  for (const session of filtered) {
    const date = new Date(session.savedAt).toISOString().split('T')[0];
    if (!dailyBreakdown[date]) {
      dailyBreakdown[date] = { sessions: 0, passed: 0, totalScore: 0 };
    }
    dailyBreakdown[date].sessions++;
    if (session.passed) dailyBreakdown[date].passed++;
    dailyBreakdown[date].totalScore += session.finalScore || 0;
  }

  // Calculate daily averages
  for (const date of Object.keys(dailyBreakdown)) {
    const day = dailyBreakdown[date];
    day.avgScore = Math.round((day.totalScore / day.sessions) * 10) / 10;
    day.passRate = Math.round((day.passed / day.sessions) * 100);
  }

  return {
    period: days,
    totalSessions: filtered.length,
    passRate: Math.round((totalPassed / filtered.length) * 100),
    avgScore,
    dailyBreakdown,
  };
}

/**
 * Calculate score consistency (lower variance = more consistent)
 * @param {number[]} scores - Array of scores
 * @returns {Object} Consistency metrics
 */
function calculateConsistency(scores) {
  if (scores.length < 2) return { variance: 0, standardDeviation: 0, label: 'insufficient_data' };

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  let label;
  if (stdDev < 1) label = 'very_consistent';
  else if (stdDev < 2) label = 'consistent';
  else if (stdDev < 3) label = 'moderate';
  else label = 'inconsistent';

  return {
    variance: Math.round(variance * 10) / 10,
    standardDeviation: stdDev,
    label,
    mean: Math.round(mean * 10) / 10,
  };
}

export default {
  getDashboardAnalytics,
  getCandidateAnalytics,
  getSuccessRateAnalytics,
};
