/**
 * Resume Parsing Module
 * =====================
 * Parses resume text to extract:
 * - Skills and technologies
 * - Experience level estimation
 * - Areas of expertise
 * - Generates targeted interview questions based on resume content
 * 
 * Accepts plain text (extracted from PDF/DOC on the client side).
 * Uses pattern matching and NLP-lite techniques for extraction.
 * 
 * @module resume
 * @author Syed Umer
 */

// ─── Technology / Skill Dictionaries ───

const SKILL_CATEGORIES = {
  'Programming Languages': [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
    'dart', 'elixir', 'haskell', 'lua', 'objective-c', 'assembly',
  ],
  'Frontend Frameworks': [
    'react', 'react.js', 'reactjs', 'angular', 'vue', 'vue.js', 'vuejs',
    'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'ember', 'backbone',
    'jquery', 'bootstrap', 'tailwind', 'material-ui', 'ant design',
  ],
  'Backend Frameworks': [
    'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'fastapi',
    'spring', 'spring boot', 'rails', 'ruby on rails', 'laravel', 'asp.net',
    'nestjs', 'koa', 'hapi', 'gin', 'echo', 'fiber',
  ],
  'Databases': [
    'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
    'dynamodb', 'cassandra', 'sqlite', 'oracle', 'sql server', 'mariadb',
    'neo4j', 'couchdb', 'firebase', 'supabase', 'prisma', 'sequelize',
  ],
  'Cloud & DevOps': [
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
    'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci',
    'circleci', 'travis ci', 'nginx', 'apache', 'linux', 'bash',
    'cloudflare', 'vercel', 'netlify', 'heroku', 'digitalocean',
  ],
  'Mobile': [
    'react native', 'flutter', 'swift', 'kotlin', 'ios', 'android',
    'xamarin', 'cordova', 'ionic', 'expo',
  ],
  'Data & ML': [
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras',
    'scikit-learn', 'pandas', 'numpy', 'data science', 'nlp',
    'computer vision', 'neural network', 'hadoop', 'spark', 'kafka',
    'airflow', 'tableau', 'power bi',
  ],
  'Tools & Practices': [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'agile', 'scrum',
    'kanban', 'ci/cd', 'tdd', 'bdd', 'pair programming', 'code review',
    'microservices', 'rest', 'graphql', 'grpc', 'websocket', 'oauth',
    'jwt', 'api design',
  ],
};

// ─── Experience Level Indicators ───

const EXPERIENCE_INDICATORS = {
  senior: [
    'senior', 'lead', 'principal', 'staff', 'architect', 'manager', 'director',
    'head of', 'vp of', 'chief', 'cto', '10+ years', '8+ years', '7+ years',
    'mentored', 'led a team', 'managed a team',
  ],
  mid: [
    'mid-level', 'mid level', '3+ years', '4+ years', '5+ years', '6+ years',
    'contributed to', 'collaborated', 'developed multiple', 'full-stack',
  ],
  junior: [
    'junior', 'intern', 'entry-level', 'entry level', 'fresh graduate',
    'bootcamp', 'self-taught', '1 year', '2 years', 'beginner',
    'student', 'graduate',
  ],
};

/**
 * Parse resume text and extract structured information
 * @param {string} resumeText - Plain text content of the resume
 * @returns {Object} Parsed resume data
 */
export function parseResume(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') {
    return { error: 'Invalid resume text', skills: [], experience: 'unknown' };
  }

  const lowerText = resumeText.toLowerCase();

  // Extract skills by category
  const extractedSkills = {};
  const allSkills = [];

  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    const found = skills.filter(skill => {
      // Use word boundary-like matching
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(resumeText);
    });

    if (found.length > 0) {
      extractedSkills[category] = found;
      allSkills.push(...found);
    }
  }

  // Estimate experience level
  const experienceLevel = estimateExperience(lowerText);

  // Extract years of experience
  const yearsMatch = resumeText.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|professional)/i);
  const estimatedYears = yearsMatch ? parseInt(yearsMatch[1]) : null;

  // Detect areas of expertise (categories with most skills)
  const expertise = Object.entries(extractedSkills)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([category, skills]) => ({
      area: category,
      skillCount: skills.length,
      skills,
    }));

  // Extract education indicators
  const education = extractEducation(resumeText);

  // Extract project/achievement indicators
  const achievements = extractAchievements(resumeText);

  // Extract candidate name
  const candidateName = extractName(resumeText);

  return {
    skills: {
      all: [...new Set(allSkills)],
      byCategory: extractedSkills,
      count: allSkills.length,
    },
    experienceLevel,
    estimatedYears,
    expertise,
    education,
    achievements,
    candidateName,
    skillDensity: Math.round((allSkills.length / Math.max(resumeText.split(/\s+/).length, 1)) * 100 * 10) / 10,
  };
}

/**
 * Generate targeted interview questions based on parsed resume
 * @param {Object} parsedResume - Output from parseResume()
 * @returns {Object} Generated question prompts for the AI
 */
export function generateResumeBasedPrompt(parsedResume) {
  const { skills, experienceLevel, expertise, achievements } = parsedResume;

  if (!skills || skills.count === 0) {
    return {
      systemPromptAddition: '',
      suggestedTopics: [],
      difficultyOverride: null,
    };
  }

  // Build skill-aware prompt addition
  const topSkills = skills.all.slice(0, 10).join(', ');
  const topAreas = expertise.map(e => e.area).join(', ');

  let difficultyOverride = null;
  if (experienceLevel === 'senior') difficultyOverride = 2;
  else if (experienceLevel === 'mid') difficultyOverride = 2;
  else difficultyOverride = 1;

  const systemPromptAddition = `
CANDIDATE RESUME CONTEXT:
- Listed skills: ${topSkills}
- Areas of expertise: ${topAreas}
- Experience level: ${experienceLevel}
${achievements.length > 0 ? `- Notable achievements: ${achievements.slice(0, 3).join('; ')}` : ''}

INSTRUCTIONS FOR RESUME-BASED INTERVIEW:
- Ask questions specifically about the technologies and skills listed on their resume
- Probe depth of knowledge in their stated areas of expertise
- For senior candidates, ask architecture and system design questions related to their stack
- Challenge their claimed experience with scenario-based questions
- Ask about specific projects or achievements mentioned
- Verify skill claims with technical deep-dives
`;

  // Generate suggested question topics
  const suggestedTopics = [];
  for (const area of expertise) {
    suggestedTopics.push({
      topic: area.area,
      skills: area.skills.slice(0, 3),
      questionHint: `Ask about their experience with ${area.skills.slice(0, 2).join(' and ')} in production environments.`,
    });
  }

  // Add behavioral questions about achievements
  if (achievements.length > 0) {
    suggestedTopics.push({
      topic: 'Achievements',
      skills: [],
      questionHint: `Ask them to elaborate on their achievements and the impact they made.`,
    });
  }

  return {
    systemPromptAddition,
    suggestedTopics,
    difficultyOverride,
    experienceLevel,
  };
}

/**
 * Estimate experience level from resume text
 */
function estimateExperience(lowerText) {
  for (const [level, indicators] of Object.entries(EXPERIENCE_INDICATORS)) {
    const matches = indicators.filter(ind => lowerText.includes(ind));
    if (matches.length >= 2) return level;
  }

  // Fallback: estimate by keyword density
  const seniorMatches = EXPERIENCE_INDICATORS.senior.filter(ind => lowerText.includes(ind)).length;
  const midMatches = EXPERIENCE_INDICATORS.mid.filter(ind => lowerText.includes(ind)).length;
  const juniorMatches = EXPERIENCE_INDICATORS.junior.filter(ind => lowerText.includes(ind)).length;

  if (seniorMatches > midMatches && seniorMatches > juniorMatches) return 'senior';
  if (midMatches > juniorMatches) return 'mid';
  if (juniorMatches > 0) return 'junior';
  return 'mid'; // default assumption
}

/**
 * Extract education information
 */
function extractEducation(text) {
  const degrees = [];
  const degreePatterns = [
    /(?:bachelor|b\.?s\.?|b\.?a\.?|b\.?sc\.?|b\.?tech)/i,
    /(?:master|m\.?s\.?|m\.?a\.?|m\.?sc\.?|m\.?tech|mba)/i,
    /(?:ph\.?d|doctorate|doctor)/i,
    /(?:diploma|certificate|certification)/i,
  ];

  const degreeLabels = ['Bachelor\'s', 'Master\'s', 'PhD/Doctorate', 'Certification'];

  degreePatterns.forEach((pattern, i) => {
    if (pattern.test(text)) {
      degrees.push(degreeLabels[i]);
    }
  });

  // Check for specific institutions
  const hasCS = /computer science|software engineer|information technology|cs degree/i.test(text);

  return {
    degrees,
    isCSRelated: hasCS,
    hasDegree: degrees.length > 0,
  };
}

/**
 * Extract achievement/impact indicators
 */
function extractAchievements(text) {
  const achievements = [];

  // Look for impact statements with numbers
  const impactPatterns = [
    /(?:improved|increased|reduced|decreased|achieved|delivered|grew|scaled)\s+[\w\s]+by\s+\d+%/gi,
    /(?:managed|led|mentored)\s+(?:a\s+)?team\s+of\s+\d+/gi,
    /\$[\d,]+(?:k|m|b)?(?:\s+in\s+\w+)?/gi,
    /\d+(?:k|m|b)\+?\s+(?:users|customers|requests|transactions)/gi,
  ];

  for (const pattern of impactPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      achievements.push(...matches.map(m => m.trim()));
    }
  }

  return [...new Set(achievements)].slice(0, 5);
}

/**
 * Extract candidate name from resume text
 * Typically the first non-empty, non-header line at the top of a resume
 */
function extractName(text) {
  if (!text) return '';
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Skip common header labels
  const skipPatterns = /^(resume|curriculum vitae|cv|profile|summary|contact|objective|about|phone|email|address|portfolio|linkedin|github|http)/i;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Skip very long lines (likely a paragraph), lines with @/http (emails/links), or header labels
    if (line.length > 50) continue;
    if (/@|http|www\.|\+\d{2,}|\d{5,}/.test(line)) continue;
    if (skipPatterns.test(line)) continue;
    // Must look like a name: 2-4 capitalized words, letters/spaces/hyphens/dots only
    if (/^[A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+){1,3}$/.test(line)) {
      return line;
    }
  }
  return '';
}

export default { parseResume, generateResumeBasedPrompt };
