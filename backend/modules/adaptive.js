/**
 * Adaptive Difficulty Module
 * ==========================
 * Dynamically adjusts interview difficulty based on candidate performance.
 * Uses a rolling window of recent scores to determine next question level.
 * 
 * Difficulty Levels:
 *   1 = Easy (fundamentals, definitions)
 *   2 = Medium (application, scenarios)
 *   3 = Hard (system design, edge cases, deep dives)
 * 
 * @module adaptive
 * @author Syed Umer
 */

// ─── Difficulty Configuration ───

const DIFFICULTY_LEVELS = {
  1: {
    name: 'Easy',
    description: 'Fundamental concepts and definitions',
    promptModifier: 'Ask a basic, introductory-level question about fundamentals or definitions.',
    scoreThreshold: { up: 7, down: null }, // Move up if score >= 7
  },
  2: {
    name: 'Medium',
    description: 'Applied knowledge and scenarios',
    promptModifier: 'Ask a moderate-difficulty question involving practical application or scenario-based thinking.',
    scoreThreshold: { up: 8, down: 4 }, // Move up if >= 8, down if <= 4
  },
  3: {
    name: 'Hard',
    description: 'Advanced concepts, system design, edge cases',
    promptModifier: 'Ask an advanced, challenging question about system design, edge cases, or deep technical concepts.',
    scoreThreshold: { up: null, down: 5 }, // Move down if <= 5
  },
};

// ─── Question Type Rotation ───

const QUESTION_TYPES = [
  'technical',
  'behavioral',
  'technical',
  'problem_solving',
  'technical',
  'behavioral',
  'technical',
  'system_design',
  'situational',
  'technical',
];

const QUESTION_TYPE_PROMPTS = {
  technical: 'Ask a technical question about programming concepts, algorithms, or specific technologies.',
  behavioral: 'Ask a behavioral question using the STAR format (e.g., "Tell me about a time when...")',
  problem_solving: 'Present a coding or problem-solving scenario and ask how they would approach it.',
  system_design: 'Ask a system design question about architecture, scalability, or infrastructure.',
  situational: 'Ask a situational question about how they would handle a hypothetical workplace scenario.',
};

/**
 * Manages adaptive difficulty state for a session
 */
export class AdaptiveDifficultyManager {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.startLevel - Starting difficulty (1-3), default 1
   * @param {number} options.windowSize - Rolling window size for score averaging, default 3
   */
  constructor(options = {}) {
    this.currentLevel = options.startLevel || 1;
    this.windowSize = options.windowSize || 3;
    this.scoreHistory = [];
    this.levelHistory = [this.currentLevel];
    this.questionIndex = 0;
    this.followUpPending = false;
    this.followUpContext = null;
    this.adaptationLog = [];
  }

  /**
   * Record a score and potentially adjust difficulty
   * @param {number} score - Score for the last answer (0-10)
   * @returns {Object} Adaptation result with any level change
   */
  recordScore(score) {
    this.scoreHistory.push(score);

    // Get rolling average
    const recentScores = this.scoreHistory.slice(-this.windowSize);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

    const previousLevel = this.currentLevel;
    const config = DIFFICULTY_LEVELS[this.currentLevel];

    // Check if we should adjust difficulty (only after enough data)
    if (this.scoreHistory.length >= 2) {
      if (config.scoreThreshold.up !== null && avgScore >= config.scoreThreshold.up) {
        // Move up
        this.currentLevel = Math.min(3, this.currentLevel + 1);
      } else if (config.scoreThreshold.down !== null && avgScore <= config.scoreThreshold.down) {
        // Move down
        this.currentLevel = Math.max(1, this.currentLevel - 1);
      }
    }

    const changed = previousLevel !== this.currentLevel;
    const entry = {
      questionIndex: this.questionIndex,
      score,
      avgScore: Math.round(avgScore * 10) / 10,
      previousLevel,
      newLevel: this.currentLevel,
      changed,
      timestamp: new Date().toISOString(),
    };

    this.adaptationLog.push(entry);
    this.levelHistory.push(this.currentLevel);

    return entry;
  }

  /**
   * Determine if a follow-up question should be asked
   * @param {number} score - Score for the current answer
   * @param {string} question - The question that was asked
   * @param {string} answer - The candidate's answer
   * @returns {Object} Follow-up decision
   */
  shouldFollowUp(score, question, answer) {
    // Follow up on vague or incomplete answers (score 3-6)
    if (score >= 3 && score <= 6 && !this.followUpPending) {
      this.followUpPending = true;
      this.followUpContext = { question, answer, score };
      return {
        shouldFollowUp: true,
        reason: score <= 4 ? 'incomplete_answer' : 'can_elaborate',
        prompt: this._generateFollowUpPrompt(score, question, answer),
      };
    }

    // Follow up on excellent answers to probe deeper (occasionally)
    if (score >= 8 && this.questionIndex % 3 === 0 && !this.followUpPending) {
      this.followUpPending = true;
      this.followUpContext = { question, answer, score };
      return {
        shouldFollowUp: true,
        reason: 'probe_deeper',
        prompt: `The candidate gave an excellent answer. Ask a deeper follow-up question to probe their understanding further. Reference their previous answer: "${answer.substring(0, 100)}..."`,
      };
    }

    this.followUpPending = false;
    this.followUpContext = null;
    return { shouldFollowUp: false };
  }

  /**
   * Generate follow-up prompt based on score and context
   */
  _generateFollowUpPrompt(score, question, answer) {
    if (score <= 4) {
      return `The candidate's answer was incomplete or unclear. They said: "${answer.substring(0, 100)}..." Ask a targeted follow-up to help them demonstrate their knowledge better. For example: "Can you be more specific about..." or "What exactly do you mean by..."`;
    }
    return `The candidate gave a partial answer. They said: "${answer.substring(0, 100)}..." Ask them to elaborate on a specific aspect they mentioned but didn't fully explain.`;
  }

  /**
   * Get the next question configuration (difficulty + type)
   * @returns {Object} Question configuration with difficulty prompt and type
   */
  getNextQuestionConfig() {
    const level = DIFFICULTY_LEVELS[this.currentLevel];
    const typeIndex = this.questionIndex % QUESTION_TYPES.length;
    const questionType = QUESTION_TYPES[typeIndex];
    const typePrompt = QUESTION_TYPE_PROMPTS[questionType];

    // If follow-up is pending, use follow-up config instead
    if (this.followUpPending && this.followUpContext) {
      const followUpConfig = {
        difficulty: this.currentLevel,
        difficultyName: level.name,
        questionType: 'follow_up',
        isFollowUp: true,
        prompt: this.followUpContext.prompt || `Ask a follow-up question about: "${this.followUpContext.question}"`,
      };
      // Reset follow-up state after consuming
      this.followUpPending = false;
      return followUpConfig;
    }

    this.questionIndex++;

    return {
      difficulty: this.currentLevel,
      difficultyName: level.name,
      questionType,
      isFollowUp: false,
      prompt: `${level.promptModifier} ${typePrompt}`,
    };
  }

  /**
   * Get current adaptive state summary
   * @returns {Object} Summary of adaptive state
   */
  getState() {
    const recentScores = this.scoreHistory.slice(-this.windowSize);
    const avgScore = recentScores.length > 0
      ? Math.round((recentScores.reduce((a, b) => a + b, 0) / recentScores.length) * 10) / 10
      : 0;

    return {
      currentLevel: this.currentLevel,
      currentLevelName: DIFFICULTY_LEVELS[this.currentLevel].name,
      questionIndex: this.questionIndex,
      totalAnswers: this.scoreHistory.length,
      recentAverage: avgScore,
      scoreHistory: [...this.scoreHistory],
      levelHistory: [...this.levelHistory],
      adaptationLog: [...this.adaptationLog],
    };
  }

  /**
   * Serialize state for persistence
   * @returns {Object} Serializable state
   */
  serialize() {
    return {
      currentLevel: this.currentLevel,
      windowSize: this.windowSize,
      scoreHistory: this.scoreHistory,
      levelHistory: this.levelHistory,
      questionIndex: this.questionIndex,
      followUpPending: this.followUpPending,
      followUpContext: this.followUpContext,
      adaptationLog: this.adaptationLog,
    };
  }

  /**
   * Restore state from serialized data
   * @param {Object} data - Serialized state
   */
  static fromSerialized(data) {
    const manager = new AdaptiveDifficultyManager({
      startLevel: data.currentLevel,
      windowSize: data.windowSize,
    });
    manager.scoreHistory = data.scoreHistory || [];
    manager.levelHistory = data.levelHistory || [];
    manager.questionIndex = data.questionIndex || 0;
    manager.followUpPending = data.followUpPending || false;
    manager.followUpContext = data.followUpContext || null;
    manager.adaptationLog = data.adaptationLog || [];
    return manager;
  }
}

export default { AdaptiveDifficultyManager, DIFFICULTY_LEVELS, QUESTION_TYPES };
