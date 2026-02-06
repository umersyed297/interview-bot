/**
 * Feedback Engine Module
 * ======================
 * Generates recruiter-style interview feedback with:
 * - Per-answer breakdowns
 * - Overall strengths & weaknesses
 * - Actionable improvement roadmap
 * - Professional language suited for candidate development
 * 
 * @module feedback
 * @author Syed Umer
 */

// ─── Rating Descriptors ───

const PERFORMANCE_TIERS = {
  exceptional: { min: 9, label: 'Exceptional', emoji: '🌟', description: 'Outstanding performance. Interview-ready.' },
  strong: { min: 7.5, label: 'Strong', emoji: '💪', description: 'Solid performance with minor gaps.' },
  competent: { min: 6, label: 'Competent', emoji: '👍', description: 'Adequate but needs improvement in key areas.' },
  developing: { min: 4, label: 'Developing', emoji: '📚', description: 'Significant gaps. Needs focused practice.' },
  beginner: { min: 0, label: 'Beginner', emoji: '🌱', description: 'Fundamental skills need development.' },
};

/**
 * Get performance tier from score
 * @param {number} score - Overall score (0-10)
 * @returns {Object} Performance tier details
 */
function getPerformanceTier(score) {
  for (const [key, tier] of Object.entries(PERFORMANCE_TIERS)) {
    if (score >= tier.min) {
      return { key, ...tier };
    }
  }
  return { key: 'beginner', ...PERFORMANCE_TIERS.beginner };
}

/**
 * Generate comprehensive interview feedback report
 * @param {Object} sessionResult - Complete session data
 * @param {number} sessionResult.finalScore - Average final score (0-10)
 * @param {boolean} sessionResult.passed - Whether candidate passed
 * @param {Array} sessionResult.answerEvaluations - Array of per-answer evaluations
 * @param {Object} sessionResult.adaptiveState - Adaptive difficulty state
 * @param {Object} sessionResult.skillGaps - Skill gap analysis
 * @param {number} sessionResult.duration - Interview duration in seconds
 * @param {number} sessionResult.questionCount - Total questions asked
 * @returns {Object} Complete feedback report
 */
export function generateFeedbackReport(sessionResult) {
  const {
    finalScore = 0,
    passed = false,
    answerEvaluations = [],
    adaptiveState = null,
    skillGaps = null,
    duration = 0,
    questionCount = 0,
  } = sessionResult;

  const tier = getPerformanceTier(finalScore);

  // Aggregate dimension scores across all answers
  const aggregatedDimensions = aggregateDimensions(answerEvaluations);

  // Build the feedback report
  return {
    // ── Summary ──
    summary: {
      overallScore: finalScore,
      tier: tier,
      passed,
      questionCount,
      duration,
      headline: generateHeadline(finalScore, passed, tier),
    },

    // ── Dimension Breakdown ──
    dimensions: {
      technicalKnowledge: {
        score: aggregatedDimensions.aiJudgment,
        label: 'Technical Knowledge',
        feedback: getDimensionFeedback('technical', aggregatedDimensions.aiJudgment),
      },
      communication: {
        score: aggregatedDimensions.completeness,
        label: 'Communication & Clarity',
        feedback: getDimensionFeedback('communication', aggregatedDimensions.completeness),
      },
      confidence: {
        score: aggregatedDimensions.confidence,
        label: 'Confidence & Delivery',
        feedback: getDimensionFeedback('confidence', aggregatedDimensions.confidence),
      },
      relevance: {
        score: aggregatedDimensions.keywordCoverage,
        label: 'Relevance & Terminology',
        feedback: getDimensionFeedback('relevance', aggregatedDimensions.keywordCoverage),
      },
    },

    // ── Top Strengths ──
    strengths: extractTopStrengths(answerEvaluations, aggregatedDimensions),

    // ── Areas for Improvement ──
    improvements: extractImprovements(answerEvaluations, aggregatedDimensions),

    // ── Actionable Roadmap ──
    roadmap: generateImprovementRoadmap(aggregatedDimensions, skillGaps),

    // ── Per-Answer Highlights ──
    answerHighlights: generateAnswerHighlights(answerEvaluations),

    // ── Difficulty Progression ──
    difficultyProgression: adaptiveState ? {
      startLevel: adaptiveState.levelHistory?.[0] || 1,
      endLevel: adaptiveState.currentLevel,
      peaked: Math.max(...(adaptiveState.levelHistory || [1])),
      trajectory: getTrajectory(adaptiveState.levelHistory || []),
    } : null,
  };
}

/**
 * Aggregate dimension scores across all evaluations
 */
function aggregateDimensions(evaluations) {
  if (evaluations.length === 0) {
    return { aiJudgment: 0, keywordCoverage: 0, completeness: 0, confidence: 0 };
  }

  const sums = { aiJudgment: 0, keywordCoverage: 0, completeness: 0, confidence: 0 };
  let count = 0;

  for (const eval_ of evaluations) {
    if (eval_?.dimensions) {
      sums.aiJudgment += eval_.dimensions.aiJudgment?.score || 0;
      sums.keywordCoverage += eval_.dimensions.keywordCoverage?.score || 0;
      sums.completeness += eval_.dimensions.completeness?.score || 0;
      sums.confidence += eval_.dimensions.confidence?.score || 0;
      count++;
    }
  }

  if (count === 0) return sums;

  return {
    aiJudgment: Math.round((sums.aiJudgment / count) * 10) / 10,
    keywordCoverage: Math.round((sums.keywordCoverage / count) * 10) / 10,
    completeness: Math.round((sums.completeness / count) * 10) / 10,
    confidence: Math.round((sums.confidence / count) * 10) / 10,
  };
}

/**
 * Generate a headline summary
 */
function generateHeadline(score, passed, tier) {
  if (score >= 9) return `${tier.emoji} Outstanding! You demonstrated mastery-level interview skills.`;
  if (score >= 7.5) return `${tier.emoji} Strong performance! You're well-prepared with minor areas to polish.`;
  if (score >= 6) return `${tier.emoji} Solid foundation. A few targeted improvements will make a big difference.`;
  if (score >= 4) return `${tier.emoji} Keep practicing! Focus on the improvement areas below to level up.`;
  return `${tier.emoji} Everyone starts somewhere. Use the roadmap below to build your interview skills.`;
}

/**
 * Get feedback text for a specific dimension
 */
function getDimensionFeedback(dimension, score) {
  const feedbackMap = {
    technical: {
      high: 'Excellent technical depth. You demonstrated strong command of relevant concepts and technologies.',
      medium: 'Adequate technical knowledge. Consider deepening your understanding of core concepts.',
      low: 'Technical knowledge needs strengthening. Focus on fundamentals and practice explaining concepts clearly.',
    },
    communication: {
      high: 'Clear, well-structured responses. You communicate complex ideas effectively.',
      medium: 'Communication is decent but could be more structured. Try using the STAR method for behavioral questions.',
      low: 'Responses need more structure and detail. Practice giving complete, multi-sentence answers.',
    },
    confidence: {
      high: 'Confident and assertive delivery. You project professionalism and conviction.',
      medium: 'Generally confident but some hesitation detected. Reduce hedging language like "I think" or "maybe".',
      low: 'Work on projecting more confidence. Replace uncertain phrases with definitive statements.',
    },
    relevance: {
      high: 'Excellent use of relevant terminology and domain-specific language.',
      medium: 'Good relevance but could incorporate more specific technical terms.',
      low: 'Responses could be more focused on the topic. Use domain-specific vocabulary.',
    },
  };

  const level = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low';
  return feedbackMap[dimension]?.[level] || 'No specific feedback available.';
}

/**
 * Extract top strengths from evaluations
 */
function extractTopStrengths(evaluations, aggregated) {
  const strengthCounts = {};

  for (const eval_ of evaluations) {
    if (eval_?.strengths) {
      for (const strength of eval_.strengths) {
        strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
      }
    }
  }

  // Sort by frequency and take top 5
  const topStrengths = Object.entries(strengthCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([strength, count]) => ({
      text: strength,
      frequency: count,
      consistency: Math.round((count / Math.max(evaluations.length, 1)) * 100),
    }));

  // Add dimension-level strengths
  if (aggregated.aiJudgment >= 7 && !topStrengths.find(s => s.text.includes('technical'))) {
    topStrengths.push({ text: 'Consistent technical accuracy', frequency: 0, consistency: 0 });
  }
  if (aggregated.confidence >= 7 && !topStrengths.find(s => s.text.includes('confident'))) {
    topStrengths.push({ text: 'Strong professional demeanor', frequency: 0, consistency: 0 });
  }

  return topStrengths.slice(0, 5);
}

/**
 * Extract improvement areas from evaluations
 */
function extractImprovements(evaluations, aggregated) {
  const weaknessCounts = {};

  for (const eval_ of evaluations) {
    if (eval_?.weaknesses) {
      for (const weakness of eval_.weaknesses) {
        weaknessCounts[weakness] = (weaknessCounts[weakness] || 0) + 1;
      }
    }
  }

  const improvements = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([weakness, count]) => ({
      text: weakness,
      frequency: count,
      priority: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
    }));

  return improvements;
}

/**
 * Generate a structured improvement roadmap
 */
function generateImprovementRoadmap(aggregated, skillGaps) {
  const roadmap = {
    immediate: [],   // Do this week
    shortTerm: [],   // Do this month
    longTerm: [],    // Ongoing practice
  };

  // Immediate actions based on lowest dimensions
  const dimensions = [
    { name: 'Technical Knowledge', score: aggregated.aiJudgment },
    { name: 'Communication', score: aggregated.completeness },
    { name: 'Confidence', score: aggregated.confidence },
    { name: 'Relevance', score: aggregated.keywordCoverage },
  ].sort((a, b) => a.score - b.score);

  const weakest = dimensions[0];
  const secondWeakest = dimensions[1];

  // Immediate (this week)
  if (weakest.score < 6) {
    const immediateActions = {
      'Technical Knowledge': 'Review fundamental concepts in your target technology. Practice explaining them out loud.',
      'Communication': 'Record yourself answering 3 common interview questions. Listen back and note areas to improve.',
      'Confidence': 'Practice power poses before mock interviews. Replace "I think" with "I know" in daily speech.',
      'Relevance': 'Create a list of 20 key terms for your target role. Practice using them naturally in sentences.',
    };
    roadmap.immediate.push({
      area: weakest.name,
      action: immediateActions[weakest.name] || 'Practice this skill area daily.',
      priority: 'high',
    });
  }

  if (secondWeakest.score < 6) {
    roadmap.immediate.push({
      area: secondWeakest.name,
      action: `Focus secondary attention on improving ${secondWeakest.name.toLowerCase()}.`,
      priority: 'medium',
    });
  }

  // Short-term (this month)
  roadmap.shortTerm.push({
    action: 'Complete 5 full mock interviews and track your score progression.',
    priority: 'high',
  });

  if (aggregated.completeness < 6) {
    roadmap.shortTerm.push({
      action: 'Practice STAR method: Write out 5 stories from your experience following Situation-Task-Action-Result.',
      priority: 'high',
    });
  }

  if (skillGaps && skillGaps.gaps && skillGaps.gaps.length > 0) {
    roadmap.shortTerm.push({
      action: `Study these identified skill gaps: ${skillGaps.gaps.slice(0, 3).map(g => g.topic).join(', ')}`,
      priority: 'high',
    });
  }

  // Long-term (ongoing)
  roadmap.longTerm.push({
    action: 'Do one mock interview per week to maintain and improve skills.',
    priority: 'medium',
  });
  roadmap.longTerm.push({
    action: 'Read technical blogs and practice explaining new concepts to build terminology.',
    priority: 'medium',
  });
  roadmap.longTerm.push({
    action: 'Join a study group or find a mock interview partner for peer feedback.',
    priority: 'low',
  });

  return roadmap;
}

/**
 * Generate per-answer highlights (best and worst)
 */
function generateAnswerHighlights(evaluations) {
  if (evaluations.length === 0) return { best: null, worst: null, all: [] };

  const sorted = [...evaluations]
    .filter(e => e?.compositeScore !== undefined)
    .sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    best: sorted[0] || null,
    worst: sorted[sorted.length - 1] || null,
    all: sorted.map((e, i) => ({
      index: i + 1,
      score: e.compositeScore,
      strengths: (e.strengths || []).slice(0, 2),
      weaknesses: (e.weaknesses || []).slice(0, 2),
    })),
  };
}

/**
 * Determine difficulty trajectory label
 */
function getTrajectory(levelHistory) {
  if (levelHistory.length < 2) return 'stable';
  const first = levelHistory[0];
  const last = levelHistory[levelHistory.length - 1];
  if (last > first) return 'ascending';
  if (last < first) return 'descending';
  return 'stable';
}

/**
 * Generate a concise text summary suitable for TTS
 * @param {Object} report - Full feedback report
 * @returns {string} Short text summary
 */
export function generateSpokenSummary(report) {
  const { summary, strengths, improvements, dimensions } = report;

  let spoken = `Your interview score is ${summary.overallScore} out of 10. ${summary.tier.description} `;

  if (strengths.length > 0) {
    spoken += `Your top strengths are: ${strengths.slice(0, 2).map(s => s.text).join(' and ')}. `;
  }

  if (improvements.length > 0) {
    spoken += `Key areas to improve: ${improvements.slice(0, 2).map(i => i.text).join(' and ')}. `;
  }

  // Add lowest dimension callout
  const dimEntries = Object.entries(dimensions).sort((a, b) => a[1].score - b[1].score);
  if (dimEntries.length > 0 && dimEntries[0][1].score < 6) {
    spoken += `Focus especially on ${dimEntries[0][1].label.toLowerCase()}.`;
  }

  return spoken;
}

export default { generateFeedbackReport, generateSpokenSummary };
