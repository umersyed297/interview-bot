/**
 * Anti-Cheat Detection Module
 * ============================
 * Detects potential cheating patterns during interviews:
 * - Unnaturally fast response times (reading pre-written answers)
 * - Copy-paste patterns (sudden long, perfect answers)
 * - Response consistency anomalies
 * - Vocabulary complexity spikes (using tools)
 * - Timing pattern analysis
 * 
 * Flags are informational, not blocking. Uses a scoring system
 * where higher = more suspicious (0-100 scale).
 * 
 * @module anti-cheat
 * @author Syed Umer
 */

// ─── Configuration ───

const CONFIG = {
  // Minimum seconds expected for a thoughtful answer
  MIN_RESPONSE_TIME_SEC: 3,
  // Words per minute reading speed (for detecting pre-written answers)
  MAX_NATURAL_WPM: 200,
  // Vocabulary complexity spike threshold
  COMPLEXITY_SPIKE_THRESHOLD: 2.5,
  // Minimum answers needed before analysis is meaningful
  MIN_ANSWERS_FOR_ANALYSIS: 3,
  // Suspicion score thresholds
  LOW_SUSPICION: 20,
  MEDIUM_SUSPICION: 40,
  HIGH_SUSPICION: 60,
};

/**
 * Manages anti-cheat monitoring for a session
 */
export class AntiCheatMonitor {
  constructor() {
    this.responseTimings = [];
    this.responseLengths = [];
    this.vocabularyComplexities = [];
    this.flags = [];
    this.lastQuestionTime = null;
    this.overallSuspicionScore = 0;
  }

  /**
   * Record when a question was asked (start the timer)
   */
  questionAsked() {
    this.lastQuestionTime = Date.now();
  }

  /**
   * Analyze a candidate's answer for cheating indicators
   * @param {string} answer - The candidate's answer text
   * @param {number} score - AI-assigned score for this answer
   * @returns {Object} Analysis result with flags and suspicion score
   */
  analyzeAnswer(answer, score) {
    const now = Date.now();
    const responseTimeMs = this.lastQuestionTime ? now - this.lastQuestionTime : null;
    const responseTimeSec = responseTimeMs ? responseTimeMs / 1000 : null;

    const words = answer.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const avgWordLength = words.length > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / words.length
      : 0;

    // Calculate vocabulary complexity (Flesch-like approximation)
    const longWords = words.filter(w => w.length > 6).length;
    const complexityRatio = wordCount > 0 ? longWords / wordCount : 0;

    // Store metrics
    this.responseLengths.push(wordCount);
    this.vocabularyComplexities.push(complexityRatio);
    if (responseTimeSec !== null) {
      this.responseTimings.push(responseTimeSec);
    }

    const answerFlags = [];

    // ── Check 1: Suspiciously Fast Response ──
    if (responseTimeSec !== null && responseTimeSec < CONFIG.MIN_RESPONSE_TIME_SEC && wordCount > 20) {
      answerFlags.push({
        type: 'fast_response',
        severity: 'medium',
        detail: `Responded with ${wordCount} words in ${responseTimeSec.toFixed(1)}s`,
        points: 15,
      });
    }

    // ── Check 2: Words Per Minute Too High ──
    if (responseTimeSec && responseTimeSec > 0) {
      const wpm = (wordCount / responseTimeSec) * 60;
      if (wpm > CONFIG.MAX_NATURAL_WPM && wordCount > 15) {
        answerFlags.push({
          type: 'high_wpm',
          severity: 'high',
          detail: `Effective ${Math.round(wpm)} WPM (natural speech: ~130 WPM)`,
          points: 25,
        });
      }
    }

    // ── Check 3: Sudden Length Spike (copy-paste indicator) ──
    if (this.responseLengths.length >= CONFIG.MIN_ANSWERS_FOR_ANALYSIS) {
      const previousLengths = this.responseLengths.slice(0, -1);
      const avgPrevLength = previousLengths.reduce((a, b) => a + b, 0) / previousLengths.length;
      if (avgPrevLength > 0 && wordCount > avgPrevLength * 3 && wordCount > 50) {
        answerFlags.push({
          type: 'length_spike',
          severity: 'medium',
          detail: `Answer is ${Math.round(wordCount / avgPrevLength)}x longer than average (${wordCount} vs ${Math.round(avgPrevLength)} words)`,
          points: 15,
        });
      }
    }

    // ── Check 4: Vocabulary Complexity Spike ──
    if (this.vocabularyComplexities.length >= CONFIG.MIN_ANSWERS_FOR_ANALYSIS) {
      const previousComplexities = this.vocabularyComplexities.slice(0, -1);
      const avgComplexity = previousComplexities.reduce((a, b) => a + b, 0) / previousComplexities.length;
      if (avgComplexity > 0 && complexityRatio > avgComplexity * CONFIG.COMPLEXITY_SPIKE_THRESHOLD) {
        answerFlags.push({
          type: 'complexity_spike',
          severity: 'low',
          detail: `Vocabulary complexity spiked to ${(complexityRatio * 100).toFixed(0)}% (avg: ${(avgComplexity * 100).toFixed(0)}%)`,
          points: 10,
        });
      }
    }

    // ── Check 5: Score-Timing Inconsistency ──
    // Very fast + very high score = suspicious
    if (responseTimeSec !== null && responseTimeSec < 5 && score >= 9 && wordCount > 30) {
      answerFlags.push({
        type: 'score_timing_mismatch',
        severity: 'high',
        detail: `Perfect score (${score}/10) with very fast response (${responseTimeSec.toFixed(1)}s)`,
        points: 20,
      });
    }

    // ── Check 6: Robotic/Repetitive Patterns ──
    const repeatedPhrases = detectRepetitivePatterns(answer);
    if (repeatedPhrases.length > 2) {
      answerFlags.push({
        type: 'repetitive_pattern',
        severity: 'low',
        detail: `Detected ${repeatedPhrases.length} repeated phrases`,
        points: 5,
      });
    }

    // Accumulate flags
    this.flags.push(...answerFlags);

    // Calculate running suspicion score (decaying average)
    const answerPoints = answerFlags.reduce((sum, f) => sum + f.points, 0);
    this.overallSuspicionScore = Math.min(100,
      Math.round(this.overallSuspicionScore * 0.7 + answerPoints * 0.3)
    );

    return {
      flags: answerFlags,
      answerSuspicionPoints: answerPoints,
      overallSuspicionScore: this.overallSuspicionScore,
      suspicionLevel: this._getSuspicionLevel(),
      metrics: {
        responseTimeSec: responseTimeSec ? Math.round(responseTimeSec * 10) / 10 : null,
        wordCount,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        complexityRatio: Math.round(complexityRatio * 100) / 100,
      },
    };
  }

  /**
   * Get overall session integrity report
   * @returns {Object} Integrity assessment
   */
  getIntegrityReport() {
    const totalFlags = this.flags.length;
    const highSeverityFlags = this.flags.filter(f => f.severity === 'high').length;
    const mediumSeverityFlags = this.flags.filter(f => f.severity === 'medium').length;

    // Timing statistics
    const avgResponseTime = this.responseTimings.length > 0
      ? Math.round((this.responseTimings.reduce((a, b) => a + b, 0) / this.responseTimings.length) * 10) / 10
      : null;

    // Length consistency
    const lengthStdDev = this.responseLengths.length >= 2
      ? calculateStdDev(this.responseLengths)
      : 0;

    return {
      overallSuspicionScore: this.overallSuspicionScore,
      suspicionLevel: this._getSuspicionLevel(),
      totalFlags,
      flagBreakdown: {
        high: highSeverityFlags,
        medium: mediumSeverityFlags,
        low: totalFlags - highSeverityFlags - mediumSeverityFlags,
      },
      flags: this.flags,
      timing: {
        averageResponseTimeSec: avgResponseTime,
        fastestResponseSec: this.responseTimings.length > 0 ? Math.min(...this.responseTimings) : null,
        slowestResponseSec: this.responseTimings.length > 0 ? Math.max(...this.responseTimings) : null,
      },
      responseLengthConsistency: {
        averageWords: this.responseLengths.length > 0
          ? Math.round(this.responseLengths.reduce((a, b) => a + b, 0) / this.responseLengths.length)
          : 0,
        standardDeviation: Math.round(lengthStdDev * 10) / 10,
      },
      verdict: this._getVerdict(),
    };
  }

  /**
   * Get suspicion level label
   */
  _getSuspicionLevel() {
    if (this.overallSuspicionScore >= CONFIG.HIGH_SUSPICION) return 'high';
    if (this.overallSuspicionScore >= CONFIG.MEDIUM_SUSPICION) return 'medium';
    if (this.overallSuspicionScore >= CONFIG.LOW_SUSPICION) return 'low';
    return 'clean';
  }

  /**
   * Get final verdict
   */
  _getVerdict() {
    const level = this._getSuspicionLevel();
    switch (level) {
      case 'high': return 'Multiple suspicious patterns detected. Manual review recommended.';
      case 'medium': return 'Some irregular patterns noted. Results may need verification.';
      case 'low': return 'Minor irregularities detected. Generally reliable results.';
      case 'clean': return 'No suspicious patterns detected. Results are reliable.';
      default: return 'Assessment pending.';
    }
  }

  /**
   * Serialize for persistence
   */
  serialize() {
    return {
      responseTimings: this.responseTimings,
      responseLengths: this.responseLengths,
      vocabularyComplexities: this.vocabularyComplexities,
      flags: this.flags,
      overallSuspicionScore: this.overallSuspicionScore,
    };
  }
}

/**
 * Detect repeated phrases in text
 * @param {string} text
 * @returns {string[]} Repeated phrases
 */
function detectRepetitivePatterns(text) {
  const words = text.toLowerCase().split(/\s+/);
  const trigrams = [];
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.push(words.slice(i, i + 3).join(' '));
  }
  
  const counts = {};
  for (const tri of trigrams) {
    counts[tri] = (counts[tri] || 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([phrase]) => phrase);
}

/**
 * Calculate standard deviation
 * @param {number[]} values
 * @returns {number}
 */
function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export default { AntiCheatMonitor };
