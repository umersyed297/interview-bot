/**
 * Skill Gap Detection Module
 * ===========================
 * Identifies knowledge gaps by analyzing:
 * - Per-topic scoring patterns
 * - Question type performance differences
 * - Technical depth capabilities
 * - Comparison against expected skill baselines
 * 
 * Produces a skill map with gap identification and
 * prioritized learning recommendations.
 * 
 * @module skill-gap
 * @author Syed Umer
 */

// ─── Expected Skill Baselines by Role Level ───

const ROLE_BASELINES = {
  junior: {
    technical: 5,
    behavioral: 5,
    problem_solving: 4,
    system_design: 3,
    communication: 5,
  },
  mid: {
    technical: 7,
    behavioral: 6,
    problem_solving: 6,
    system_design: 5,
    communication: 6,
  },
  senior: {
    technical: 8,
    behavioral: 7,
    problem_solving: 8,
    system_design: 7,
    communication: 7,
  },
};

// ─── Topic Detection Patterns ───

const TOPIC_PATTERNS = {
  'JavaScript/TypeScript': ['javascript', 'typescript', 'js', 'ts', 'node', 'es6', 'ecmascript', 'v8', 'npm'],
  'React/Frontend': ['react', 'component', 'hook', 'frontend', 'css', 'html', 'dom', 'ui', 'ux', 'next.js', 'vue', 'angular'],
  'Backend/API': ['backend', 'api', 'rest', 'graphql', 'server', 'express', 'endpoint', 'middleware', 'authentication'],
  'Database': ['database', 'sql', 'nosql', 'query', 'schema', 'migration', 'orm', 'mongo', 'postgres', 'redis'],
  'System Design': ['system design', 'architecture', 'scalab', 'microservice', 'distributed', 'load balanc', 'caching'],
  'Data Structures': ['array', 'linked list', 'tree', 'graph', 'hash', 'stack', 'queue', 'heap', 'data structure'],
  'Algorithms': ['algorithm', 'sorting', 'searching', 'recursion', 'dynamic programming', 'complexity', 'big o', 'time complexity'],
  'DevOps/CI-CD': ['docker', 'kubernetes', 'ci/cd', 'pipeline', 'deployment', 'aws', 'cloud', 'devops', 'terraform'],
  'Testing': ['testing', 'unit test', 'integration test', 'e2e', 'jest', 'cypress', 'tdd', 'coverage', 'mock'],
  'Security': ['security', 'xss', 'csrf', 'authentication', 'authorization', 'encryption', 'vulnerability', 'owasp'],
  'Leadership': ['leadership', 'mentor', 'team lead', 'manage', 'delegate', 'vision', 'strategy'],
  'Problem Solving': ['problem solving', 'approach', 'debug', 'troubleshoot', 'root cause', 'analyze', 'optimize'],
  'Communication': ['communicate', 'present', 'explain', 'stakeholder', 'collaborate', 'feedback', 'documentation'],
};

/**
 * Manages skill gap tracking for a session
 */
export class SkillGapDetector {
  constructor(roleLevel = 'mid') {
    this.roleLevel = roleLevel;
    this.baseline = ROLE_BASELINES[roleLevel] || ROLE_BASELINES.mid;
    this.topicScores = {};      // { topic: [scores] }
    this.questionTypeScores = {}; // { type: [scores] }
    this.questionsAnalyzed = 0;
  }

  /**
   * Analyze a Q&A pair and track topic/type scores
   * @param {string} question - The interview question
   * @param {string} answer - The candidate's answer
   * @param {number} score - Score for this answer
   * @param {string} questionType - Type of question (technical, behavioral, etc.)
   * @returns {Object} Per-answer skill analysis
   */
  trackAnswer(question, answer, score, questionType = 'technical') {
    this.questionsAnalyzed++;

    // Detect topics in the question
    const detectedTopics = this._detectTopics(question);

    // Track per-topic scores
    for (const topic of detectedTopics) {
      if (!this.topicScores[topic]) {
        this.topicScores[topic] = [];
      }
      this.topicScores[topic].push(score);
    }

    // Track per-type scores
    if (!this.questionTypeScores[questionType]) {
      this.questionTypeScores[questionType] = [];
    }
    this.questionTypeScores[questionType].push(score);

    return {
      detectedTopics,
      questionType,
      score,
      topicAverages: this._getTopicAverages(),
    };
  }

  /**
   * Get comprehensive skill gap analysis
   * @returns {Object} Complete skill gap report
   */
  getAnalysis() {
    const topicAverages = this._getTopicAverages();
    const typeAverages = this._getTypeAverages();

    // Identify gaps (topics scoring below baseline)
    const gaps = [];
    for (const [topic, avgScore] of Object.entries(topicAverages)) {
      // Find the closest baseline category
      const baselineScore = this._getBaselineForTopic(topic);
      const deficit = baselineScore - avgScore;

      if (deficit > 0) {
        gaps.push({
          topic,
          currentScore: avgScore,
          expectedScore: baselineScore,
          deficit: Math.round(deficit * 10) / 10,
          severity: deficit >= 3 ? 'critical' : deficit >= 1.5 ? 'significant' : 'minor',
          recommendation: this._getTopicRecommendation(topic, avgScore),
          questionsAsked: this.topicScores[topic]?.length || 0,
        });
      }
    }

    // Sort gaps by severity (deficit)
    gaps.sort((a, b) => b.deficit - a.deficit);

    // Identify strengths (topics scoring well above baseline)
    const strengths = [];
    for (const [topic, avgScore] of Object.entries(topicAverages)) {
      const baselineScore = this._getBaselineForTopic(topic);
      const surplus = avgScore - baselineScore;
      if (surplus >= 1) {
        strengths.push({
          topic,
          currentScore: avgScore,
          expectedScore: baselineScore,
          surplus: Math.round(surplus * 10) / 10,
        });
      }
    }
    strengths.sort((a, b) => b.surplus - a.surplus);

    // Question type analysis
    const typeAnalysis = {};
    for (const [type, avgScore] of Object.entries(typeAverages)) {
      const expected = this.baseline[type] || 5;
      typeAnalysis[type] = {
        score: avgScore,
        expected,
        gap: Math.round((expected - avgScore) * 10) / 10,
        status: avgScore >= expected ? 'meets_expectation' : 'below_expectation',
      };
    }

    return {
      roleLevel: this.roleLevel,
      questionsAnalyzed: this.questionsAnalyzed,
      topicScores: topicAverages,
      gaps,
      strengths,
      typeAnalysis,
      overallGapScore: this._calculateOverallGapScore(gaps),
      prioritizedLearningPath: this._generateLearningPath(gaps),
    };
  }

  /**
   * Detect which topics a question covers
   */
  _detectTopics(question) {
    const lower = question.toLowerCase();
    const detected = [];

    for (const [topic, patterns] of Object.entries(TOPIC_PATTERNS)) {
      if (patterns.some(p => lower.includes(p))) {
        detected.push(topic);
      }
    }

    // Default to General if nothing specific detected
    if (detected.length === 0) {
      detected.push('General');
    }

    return detected;
  }

  /**
   * Get average score per topic
   */
  _getTopicAverages() {
    const averages = {};
    for (const [topic, scores] of Object.entries(this.topicScores)) {
      averages[topic] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
    return averages;
  }

  /**
   * Get average score per question type
   */
  _getTypeAverages() {
    const averages = {};
    for (const [type, scores] of Object.entries(this.questionTypeScores)) {
      averages[type] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
    return averages;
  }

  /**
   * Get baseline score for a topic based on role level
   */
  _getBaselineForTopic(topic) {
    // Map topic to closest baseline category
    const topicToCategory = {
      'JavaScript/TypeScript': 'technical',
      'React/Frontend': 'technical',
      'Backend/API': 'technical',
      'Database': 'technical',
      'System Design': 'system_design',
      'Data Structures': 'technical',
      'Algorithms': 'problem_solving',
      'DevOps/CI-CD': 'technical',
      'Testing': 'technical',
      'Security': 'technical',
      'Leadership': 'behavioral',
      'Problem Solving': 'problem_solving',
      'Communication': 'communication',
      'General': 'technical',
    };

    const category = topicToCategory[topic] || 'technical';
    return this.baseline[category] || 5;
  }

  /**
   * Generate recommendation for a specific topic
   */
  _getTopicRecommendation(topic, score) {
    const recommendations = {
      'JavaScript/TypeScript': 'Review core JS concepts: closures, prototypes, async/await, event loop. Practice on platforms like LeetCode.',
      'React/Frontend': 'Build small React projects focusing on hooks, state management, and component lifecycle.',
      'Backend/API': 'Practice building REST APIs with authentication, error handling, and database integration.',
      'Database': 'Study SQL joins, indexing strategies, and database normalization. Practice query writing.',
      'System Design': 'Study Grokking the System Design Interview. Practice designing real systems like URL shorteners.',
      'Data Structures': 'Review arrays, trees, graphs, hash tables. Implement each from scratch.',
      'Algorithms': 'Practice sorting, searching, and dynamic programming. Aim for 2-3 LeetCode problems daily.',
      'DevOps/CI-CD': 'Set up a simple CI/CD pipeline with GitHub Actions. Learn Docker basics.',
      'Testing': 'Write unit tests for existing code. Learn Jest/Mocha and testing patterns.',
      'Security': 'Study OWASP Top 10. Learn about XSS, CSRF, SQL injection prevention.',
      'Leadership': 'Practice STAR method stories about leadership experiences. Read about engineering management.',
      'Problem Solving': 'Practice breaking down complex problems. Use whiteboard/verbal problem solving.',
      'Communication': 'Record yourself explaining technical concepts. Practice concise, structured answers.',
    };

    return recommendations[topic] || `Focus on improving ${topic} skills through dedicated practice and study.`;
  }

  /**
   * Calculate overall gap score (0-100, higher = more gaps)
   */
  _calculateOverallGapScore(gaps) {
    if (gaps.length === 0) return 0;
    const totalDeficit = gaps.reduce((sum, g) => sum + g.deficit, 0);
    const maxPossibleDeficit = gaps.length * 10;
    return Math.min(100, Math.round((totalDeficit / maxPossibleDeficit) * 100));
  }

  /**
   * Generate a prioritized learning path from gaps
   */
  _generateLearningPath(gaps) {
    return gaps
      .filter(g => g.severity !== 'minor')
      .slice(0, 5)
      .map((gap, index) => ({
        priority: index + 1,
        topic: gap.topic,
        currentLevel: gap.currentScore,
        targetLevel: gap.expectedScore,
        action: gap.recommendation,
        estimatedHours: gap.severity === 'critical' ? 20 : 10,
      }));
  }

  /**
   * Serialize for persistence
   */
  serialize() {
    return {
      roleLevel: this.roleLevel,
      topicScores: this.topicScores,
      questionTypeScores: this.questionTypeScores,
      questionsAnalyzed: this.questionsAnalyzed,
    };
  }

  /**
   * Restore from serialized data
   */
  static fromSerialized(data) {
    const detector = new SkillGapDetector(data.roleLevel);
    detector.topicScores = data.topicScores || {};
    detector.questionTypeScores = data.questionTypeScores || {};
    detector.questionsAnalyzed = data.questionsAnalyzed || 0;
    return detector;
  }
}

export default { SkillGapDetector };
