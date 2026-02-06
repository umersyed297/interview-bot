/**
 * Evaluation Engine Module
 * ========================
 * Provides detailed answer evaluation with multiple dimensions:
 * - Keyword coverage: checks for expected technical terms
 * - Response completeness: length, structure, specificity
 * - Confidence estimation: hedging language, filler words
 * - Semantic relevance: AI-powered relevance scoring
 * 
 * @module evaluation
 * @author Syed Umer
 */

// ─── Keyword Dictionaries by Topic ───

const TECHNICAL_KEYWORDS = {
  javascript: ['closure', 'prototype', 'async', 'await', 'promise', 'callback', 'event loop', 'hoisting', 'scope', 'this', 'arrow function', 'destructuring', 'spread', 'rest', 'module', 'import', 'export', 'class', 'inheritance', 'dom', 'api', 'fetch', 'json', 'typescript'],
  react: ['component', 'state', 'props', 'hook', 'useEffect', 'useState', 'virtual dom', 'jsx', 'render', 'lifecycle', 'context', 'redux', 'memo', 'ref', 'key', 'fragment', 'portal', 'suspense', 'lazy'],
  python: ['decorator', 'generator', 'list comprehension', 'lambda', 'class', 'inheritance', 'exception', 'module', 'package', 'pip', 'virtual environment', 'dict', 'tuple', 'set', 'async', 'await', 'type hint'],
  database: ['sql', 'nosql', 'index', 'query', 'join', 'normalization', 'transaction', 'acid', 'schema', 'migration', 'orm', 'primary key', 'foreign key', 'aggregate', 'stored procedure'],
  system_design: ['scalability', 'load balancer', 'caching', 'microservice', 'api gateway', 'database sharding', 'replication', 'cdn', 'message queue', 'rate limiting', 'circuit breaker', 'consistency', 'availability', 'partition tolerance'],
  general: ['algorithm', 'data structure', 'complexity', 'testing', 'debugging', 'version control', 'git', 'ci/cd', 'agile', 'scrum', 'code review', 'documentation', 'deployment', 'monitoring', 'security'],
  behavioral: ['team', 'leadership', 'conflict', 'challenge', 'deadline', 'communication', 'feedback', 'collaboration', 'priority', 'decision', 'mistake', 'learn', 'improve', 'initiative', 'mentor'],
};

// ─── Hedging / Low-Confidence Indicators ───

const HEDGING_PHRASES = [
  'i think', 'maybe', 'probably', 'i guess', 'not sure', 'i believe',
  'kind of', 'sort of', 'um', 'uh', 'like', 'you know', 'basically',
  'i don\'t know', 'i\'m not certain', 'it might be', 'perhaps',
  'i suppose', 'something like', 'more or less'
];

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'honestly', 'right', 'so yeah'];

// ─── STAR Method Keywords ───

const STAR_KEYWORDS = {
  situation: ['situation', 'context', 'background', 'working on', 'project', 'task', 'assigned'],
  task: ['task', 'responsible', 'goal', 'objective', 'needed to', 'had to', 'required'],
  action: ['action', 'implemented', 'developed', 'created', 'built', 'designed', 'led', 'initiated', 'proposed', 'solved'],
  result: ['result', 'outcome', 'achieved', 'improved', 'reduced', 'increased', 'delivered', 'successfully', 'impact', 'metrics'],
};

/**
 * Evaluate keyword coverage in a response against relevant topic areas
 * @param {string} answer - The candidate's answer
 * @param {string} question - The question that was asked
 * @returns {Object} Keyword analysis results
 */
export function evaluateKeywordCoverage(answer, question) {
  const lowerAnswer = answer.toLowerCase();
  const lowerQuestion = question.toLowerCase();

  // Detect which topic areas are relevant based on the question
  const relevantTopics = detectRelevantTopics(lowerQuestion);
  
  // Gather all relevant keywords
  let relevantKeywords = [];
  for (const topic of relevantTopics) {
    if (TECHNICAL_KEYWORDS[topic]) {
      relevantKeywords.push(...TECHNICAL_KEYWORDS[topic]);
    }
  }

  // Always include general and behavioral
  if (!relevantTopics.includes('general')) {
    relevantKeywords.push(...TECHNICAL_KEYWORDS.general);
  }
  if (!relevantTopics.includes('behavioral')) {
    relevantKeywords.push(...TECHNICAL_KEYWORDS.behavioral);
  }

  // Remove duplicates
  relevantKeywords = [...new Set(relevantKeywords)];

  // Find matched keywords
  const matchedKeywords = relevantKeywords.filter(kw => lowerAnswer.includes(kw));
  
  // Calculate coverage score (0-10)
  const coverageRatio = relevantKeywords.length > 0 
    ? matchedKeywords.length / Math.min(relevantKeywords.length, 8) // Expect at most 8 keywords
    : 0;
  const coverageScore = Math.min(10, Math.round(coverageRatio * 10));

  return {
    score: coverageScore,
    matchedKeywords,
    totalRelevant: relevantKeywords.length,
    matchCount: matchedKeywords.length,
    topics: relevantTopics,
  };
}

/**
 * Detect relevant topic areas from a question
 * @param {string} question - Lowercase question text
 * @returns {string[]} Array of relevant topic names
 */
function detectRelevantTopics(question) {
  const topics = [];
  
  const topicIndicators = {
    javascript: ['javascript', 'js', 'node', 'typescript', 'es6', 'ecmascript'],
    react: ['react', 'component', 'hook', 'jsx', 'redux', 'next.js', 'frontend'],
    python: ['python', 'django', 'flask', 'pip', 'pandas', 'numpy'],
    database: ['database', 'sql', 'nosql', 'mongo', 'postgres', 'mysql', 'query', 'data model'],
    system_design: ['system design', 'architecture', 'scalab', 'microservice', 'distributed', 'design a'],
    behavioral: ['tell me about', 'describe a time', 'how do you handle', 'experience', 'challenge', 'team', 'conflict', 'why do you', 'what are your', 'strength', 'weakness'],
  };

  for (const [topic, indicators] of Object.entries(topicIndicators)) {
    if (indicators.some(ind => question.includes(ind))) {
      topics.push(topic);
    }
  }

  // Default to general if no specific topic detected
  if (topics.length === 0) {
    topics.push('general');
  }

  return topics;
}

/**
 * Evaluate response completeness based on length, structure, and specificity
 * @param {string} answer - The candidate's answer
 * @returns {Object} Completeness analysis
 */
export function evaluateCompleteness(answer) {
  const words = answer.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;

  // Word count score (ideal: 30-120 words for speech)
  let lengthScore;
  if (wordCount < 10) lengthScore = 2;
  else if (wordCount < 20) lengthScore = 4;
  else if (wordCount < 30) lengthScore = 6;
  else if (wordCount <= 120) lengthScore = 9;
  else if (wordCount <= 200) lengthScore = 8;
  else lengthScore = 6; // Too verbose

  // Structure score: multiple sentences, not just one-liners
  let structureScore;
  if (sentenceCount >= 3) structureScore = 10;
  else if (sentenceCount >= 2) structureScore = 7;
  else structureScore = 4;

  // Specificity: contains numbers, examples, or specific details
  const hasNumbers = /\d+/.test(answer);
  const hasExamples = /for example|for instance|such as|like when|one time/i.test(answer);
  const hasSpecifics = /specifically|in particular|the key|the main|because|the reason/i.test(answer);
  
  let specificityScore = 4;
  if (hasNumbers) specificityScore += 2;
  if (hasExamples) specificityScore += 2;
  if (hasSpecifics) specificityScore += 2;
  specificityScore = Math.min(10, specificityScore);

  // STAR method coverage (for behavioral questions)
  const starCoverage = evaluateSTARMethod(answer);

  // Overall completeness score
  const overallScore = Math.round(
    (lengthScore * 0.3 + structureScore * 0.25 + specificityScore * 0.25 + starCoverage.score * 0.2)
  );

  return {
    score: Math.min(10, overallScore),
    wordCount,
    sentenceCount,
    lengthScore,
    structureScore,
    specificityScore,
    starCoverage,
    hasExamples,
    hasNumbers,
  };
}

/**
 * Evaluate STAR method usage in behavioral answers
 * @param {string} answer - The candidate's answer
 * @returns {Object} STAR method analysis
 */
function evaluateSTARMethod(answer) {
  const lowerAnswer = answer.toLowerCase();
  const components = {};
  let coveredCount = 0;

  for (const [component, keywords] of Object.entries(STAR_KEYWORDS)) {
    const matched = keywords.some(kw => lowerAnswer.includes(kw));
    components[component] = matched;
    if (matched) coveredCount++;
  }

  return {
    score: Math.round((coveredCount / 4) * 10),
    components,
    coveredCount,
    totalComponents: 4,
  };
}

/**
 * Evaluate confidence level based on hedging and filler words
 * @param {string} answer - The candidate's answer
 * @returns {Object} Confidence analysis
 */
export function evaluateConfidence(answer) {
  const lowerAnswer = answer.toLowerCase();
  const words = lowerAnswer.split(/\s+/);
  const wordCount = words.length;

  // Count hedging phrases
  const hedgingMatches = HEDGING_PHRASES.filter(phrase => lowerAnswer.includes(phrase));
  const hedgingCount = hedgingMatches.length;

  // Count filler words
  const fillerMatches = FILLER_WORDS.filter(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    return regex.test(lowerAnswer);
  });
  const fillerCount = fillerMatches.length;

  // Calculate hedging density (per 100 words)
  const hedgingDensity = wordCount > 0 ? (hedgingCount / wordCount) * 100 : 0;
  const fillerDensity = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;

  // Assertive language indicators
  const assertiveIndicators = [
    'i am', 'i have', 'i did', 'i will', 'i can', 'i know',
    'definitely', 'certainly', 'absolutely', 'clearly',
    'my experience', 'i successfully', 'i led', 'i built', 'i designed'
  ];
  const assertiveMatches = assertiveIndicators.filter(phrase => lowerAnswer.includes(phrase));

  // Confidence score: start at 7, subtract for hedging, add for assertiveness
  let confidenceScore = 7;
  confidenceScore -= Math.min(4, hedgingCount * 1.5);
  confidenceScore -= Math.min(2, fillerCount * 0.5);
  confidenceScore += Math.min(3, assertiveMatches.length * 1);
  confidenceScore = Math.max(1, Math.min(10, Math.round(confidenceScore)));

  return {
    score: confidenceScore,
    hedgingPhrases: hedgingMatches,
    fillerWords: fillerMatches,
    assertiveLanguage: assertiveMatches,
    hedgingDensity: Math.round(hedgingDensity * 10) / 10,
    fillerDensity: Math.round(fillerDensity * 10) / 10,
  };
}

/**
 * Perform comprehensive evaluation of a candidate's answer
 * @param {string} answer - The candidate's answer
 * @param {string} question - The question that was asked
 * @param {number} aiScore - The AI-assigned score (0-10)
 * @returns {Object} Complete evaluation with all dimensions
 */
export function evaluateAnswer(answer, question, aiScore = 0) {
  const keywordAnalysis = evaluateKeywordCoverage(answer, question);
  const completenessAnalysis = evaluateCompleteness(answer);
  const confidenceAnalysis = evaluateConfidence(answer);

  // Weighted composite score
  const compositeScore = Math.round(
    aiScore * 0.35 +                           // AI judgment (most weight)
    keywordAnalysis.score * 0.20 +             // Keyword coverage
    completenessAnalysis.score * 0.25 +        // Response completeness
    confidenceAnalysis.score * 0.20            // Confidence level
  );

  // Determine dimension-level ratings
  const getDimensionRating = (score) => {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'average';
    return 'needs_improvement';
  };

  return {
    compositeScore: Math.min(10, compositeScore),
    dimensions: {
      aiJudgment: { score: aiScore, rating: getDimensionRating(aiScore), weight: 0.35 },
      keywordCoverage: { ...keywordAnalysis, rating: getDimensionRating(keywordAnalysis.score), weight: 0.20 },
      completeness: { ...completenessAnalysis, rating: getDimensionRating(completenessAnalysis.score), weight: 0.25 },
      confidence: { ...confidenceAnalysis, rating: getDimensionRating(confidenceAnalysis.score), weight: 0.20 },
    },
    strengths: identifyStrengths(keywordAnalysis, completenessAnalysis, confidenceAnalysis, aiScore),
    weaknesses: identifyWeaknesses(keywordAnalysis, completenessAnalysis, confidenceAnalysis, aiScore),
    tips: generateImprovementTips(keywordAnalysis, completenessAnalysis, confidenceAnalysis, aiScore),
  };
}

/**
 * Identify strengths from evaluation dimensions
 */
function identifyStrengths(keywords, completeness, confidence, aiScore) {
  const strengths = [];
  if (aiScore >= 7) strengths.push('Strong technical understanding');
  if (keywords.score >= 7) strengths.push('Good use of technical terminology');
  if (completeness.score >= 7) strengths.push('Well-structured and detailed response');
  if (completeness.hasExamples) strengths.push('Provided concrete examples');
  if (completeness.hasNumbers) strengths.push('Used quantifiable data points');
  if (confidence.score >= 7) strengths.push('Confident and assertive communication');
  if (completeness.starCoverage.coveredCount >= 3) strengths.push('Good STAR method structure');
  if (confidence.assertiveLanguage.length >= 2) strengths.push('Assertive language patterns');
  return strengths;
}

/**
 * Identify weaknesses from evaluation dimensions
 */
function identifyWeaknesses(keywords, completeness, confidence, aiScore) {
  const weaknesses = [];
  if (aiScore < 5) weaknesses.push('Answer lacks technical accuracy');
  if (keywords.score < 4) weaknesses.push('Missing key technical terms');
  if (completeness.wordCount < 20) weaknesses.push('Response is too brief');
  if (completeness.wordCount > 200) weaknesses.push('Response is too verbose');
  if (!completeness.hasExamples) weaknesses.push('No concrete examples provided');
  if (completeness.structureScore < 5) weaknesses.push('Answer lacks structure');
  if (confidence.score < 5) weaknesses.push('Sounds uncertain or hesitant');
  if (confidence.hedgingPhrases.length > 3) weaknesses.push('Excessive hedging language');
  if (confidence.fillerWords.length > 2) weaknesses.push('Too many filler words');
  return weaknesses;
}

/**
 * Generate actionable improvement tips
 */
function generateImprovementTips(keywords, completeness, confidence, aiScore) {
  const tips = [];
  if (keywords.score < 5) tips.push('Use more specific technical terms relevant to the topic');
  if (completeness.wordCount < 20) tips.push('Elaborate more - aim for 30-60 words per response');
  if (!completeness.hasExamples) tips.push('Include specific examples: "For instance..." or "In my experience..."');
  if (!completeness.hasNumbers) tips.push('Add metrics when possible: "reduced load time by 40%"');
  if (confidence.score < 5) tips.push('Replace "I think" and "maybe" with "I know" and "I have experience with"');
  if (confidence.fillerWords.length > 2) tips.push('Reduce filler words (um, uh, like) - pause instead');
  if (completeness.starCoverage.coveredCount < 2) tips.push('Structure behavioral answers using STAR: Situation, Task, Action, Result');
  if (completeness.structureScore < 5) tips.push('Use multiple sentences to structure your answer clearly');
  if (aiScore < 5) tips.push('Review core concepts in this topic area before the next attempt');
  return tips;
}

export default {
  evaluateAnswer,
  evaluateKeywordCoverage,
  evaluateCompleteness,
  evaluateConfidence,
};
