import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

// Professional color palette
const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#991B1B',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  shadow: '#0F172A',
};

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Utility: strip literal \n from text
  const clean = (t: any) => typeof t === 'string' ? t.replace(/\\n/g, ' ').trim() : String(t ?? '');

  const finalScore = params.finalScore ? parseFloat(String(params.finalScore)) : 0;
  const passed = params.passed === 'true';
  const questionCount = params.questionCount ? parseInt(String(params.questionCount)) : 0;
  const duration = params.duration ? parseInt(String(params.duration)) : 0;
  const sessionId = params.sessionId ? String(params.sessionId) : '';

  // Feedback data from backend
  const [feedback, setFeedback] = useState<any>(null);
  const [hasAnnounced, setHasAnnounced] = useState(false);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;
  const scoreFade = useRef(new Animated.Value(0)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const badgeSlide = useRef(new Animated.Value(20)).current;
  const statsFade = useRef(new Animated.Value(0)).current;
  const statsSlide = useRef(new Animated.Value(30)).current;
  const sectionsFade = useRef(new Animated.Value(0)).current;
  const sectionsSlide = useRef(new Animated.Value(40)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;

  // Run entrance animations
  useEffect(() => {
    Animated.sequence([
      // Header fade in
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Score circle bounce in
      Animated.parallel([
        Animated.spring(scoreScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(scoreFade, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      // Pass/fail badge
      Animated.parallel([
        Animated.timing(badgeFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(badgeSlide, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]),
      // Stats
      Animated.parallel([
        Animated.timing(statsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(statsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Detail sections
      Animated.parallel([
        Animated.timing(sectionsFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(sectionsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Buttons
      Animated.timing(buttonsFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchFeedback();
    }
  }, [sessionId]);

  // TTS: Announce results once data is ready
  useEffect(() => {
    if (hasAnnounced) return;
    // Wait a short moment for the score animation, then announce
    const timer = setTimeout(() => {
      announceResults();
      setHasAnnounced(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const announceResults = () => {
    const grade = getGradeLabel(finalScore);
    const roundedScore = Math.round(finalScore * 10) / 10;
    const passStatus = passed ? 'Congratulations, you passed!' : 'You did not pass this time, but keep practicing.';

    let announcement = `Your interview results are ready. You scored ${roundedScore} out of 10. Your performance is rated as ${grade}. ${passStatus}`;

    if (feedback?.dimensions) {
      const dims = Object.values(feedback.dimensions) as any[];
      const best = dims.reduce((a: any, b: any) => (a.score > b.score ? a : b), dims[0]);
      if (best) {
        announcement += ` Your strongest area was ${best.label} with a score of ${best.score} out of 10.`;
      }
    }

    if (feedback?.summary?.headline) {
      announcement += ` ${feedback.summary.headline}`;
    }

    try {
      Speech.speak(announcement, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (e) {
      console.log('TTS error:', e);
    }
  };

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      try { Speech.stop(); } catch (_) {}
    };
  }, []);

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/feedback`);
      const data = await res.json();
      if (data.success && data.feedback) {
        setFeedback(data.feedback);
      }
    } catch (e) {
      console.log('Could not fetch feedback:', e);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return C.success;
    if (score >= 6) return C.warning;
    return C.danger;
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return C.successLight;
    if (score >= 6) return C.warningLight;
    return C.dangerLight;
  };

  const getGradeLabel = (score: number) => {
    if (score >= 9) return 'Exceptional';
    if (score >= 8) return 'Very Good';
    if (score >= 7) return 'Good';
    if (score >= 6) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDimIcon = (key: string) => {
    const icons: Record<string, string> = {
      technicalKnowledge: '🧠',
      communication: '💬',
      confidence: '💪',
      relevance: '🎯',
    };
    return icons[key] || '📊';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <TouchableOpacity onPress={() => router.push('/welcome')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Results</Text>
          {feedback?.summary?.tier && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {feedback.summary.tier.emoji} {feedback.summary.tier.label}
              </Text>
            </View>
          )}
          {!feedback?.summary?.tier && <View style={{ width: 50 }} />}
        </Animated.View>

        {/* Score Circle */}
        <Animated.View style={[styles.scoreSection, {
          opacity: scoreFade,
          transform: [{ scale: scoreScale }],
        }]}>
          <View style={[styles.scoreCircleOuter, { borderColor: getScoreColor(finalScore) + '30' }]}>
            <View style={[styles.scoreCircle, { borderColor: getScoreColor(finalScore), backgroundColor: getScoreBg(finalScore) }]}>
              <Text style={[styles.scoreNumber, { color: getScoreColor(finalScore) }]}>
                {Math.round(finalScore * 10) / 10}
              </Text>
              <Text style={styles.scoreLabel}>/10</Text>
            </View>
          </View>
          <Text style={[styles.gradeText, { color: getScoreColor(finalScore) }]}>
            {getGradeLabel(finalScore)}
          </Text>
        </Animated.View>

        {/* Pass/Fail Badge */}
        <Animated.View style={[styles.badgeRow, {
          opacity: badgeFade,
          transform: [{ translateY: badgeSlide }],
        }]}>
          {passed ? (
            <View style={styles.passedBadge}>
              <Text style={styles.passedText}>✓ PASSED</Text>
            </View>
          ) : (
            <View style={styles.failedBadge}>
              <Text style={styles.failedText}>NEEDS IMPROVEMENT</Text>
            </View>
          )}
        </Animated.View>

        {/* Statistics */}
        <Animated.View style={[styles.statsContainer, {
          opacity: statsFade,
          transform: [{ translateY: statsSlide }],
        }]}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{questionCount}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{formatDuration(duration)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: passed ? C.success : C.warning }]}>
                {passed ? 'Pass' : 'Retry'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </Animated.View>

        {/* Detailed Sections */}
        <Animated.View style={{
          opacity: sectionsFade,
          transform: [{ translateY: sectionsSlide }],
        }}>
          {/* Dimension Breakdown */}
          {feedback?.dimensions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skill Breakdown</Text>
              {Object.entries(feedback.dimensions).map(([key, dim]: [string, any]) => (
                <View key={key} style={styles.dimensionRow}>
                  <Text style={styles.dimensionIcon}>{getDimIcon(key)}</Text>
                  <View style={styles.dimensionContent}>
                    <View style={styles.dimensionHeader}>
                      <Text style={styles.dimensionLabel}>{dim.label}</Text>
                      <Text style={[styles.dimensionScore, { color: getScoreColor(dim.score) }]}>
                        {dim.score}/10
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${dim.score * 10}%`, backgroundColor: getScoreColor(dim.score) },
                        ]}
                      />
                    </View>
                    <Text style={styles.dimensionFeedback}>{clean(dim.feedback)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Strengths */}
          {feedback?.strengths && feedback.strengths.length > 0 && (
            <View style={[styles.section, styles.strengthSection]}>
              <Text style={styles.sectionTitle}>Top Strengths</Text>
              {feedback.strengths.map((s: any, i: number) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.bulletSuccess} />
                  <Text style={styles.listText}>{clean(s.text)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Areas for Improvement */}
          {feedback?.improvements && feedback.improvements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Areas to Improve</Text>
              {feedback.improvements.map((imp: any, i: number) => (
                <View key={i} style={styles.listItem}>
                  <View style={[styles.bulletDot, {
                    backgroundColor: imp.priority === 'high' ? C.danger : imp.priority === 'medium' ? C.warning : C.success,
                  }]} />
                  <Text style={styles.listText}>{clean(imp.text)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Improvement Roadmap */}
          {feedback?.roadmap?.immediate && feedback.roadmap.immediate.length > 0 && (
            <View style={[styles.section, styles.roadmapSection]}>
              <Text style={styles.sectionTitle}>Improvement Roadmap</Text>
              <Text style={styles.roadmapSubtitle}>This Week</Text>
              {feedback.roadmap.immediate.map((item: any, i: number) => (
                <View key={i} style={styles.roadmapItem}>
                  <View style={[styles.bulletDot, { backgroundColor: C.warning }]} />
                  <Text style={styles.roadmapText}>{clean(item.action)}</Text>
                </View>
              ))}
              {feedback.roadmap.shortTerm && feedback.roadmap.shortTerm.length > 0 && (
                <>
                  <Text style={styles.roadmapSubtitle}>This Month</Text>
                  {feedback.roadmap.shortTerm.map((item: any, i: number) => (
                    <View key={i} style={styles.roadmapItem}>
                      <View style={[styles.bulletDot, { backgroundColor: C.primaryLight }]} />
                      <Text style={styles.roadmapText}>{clean(item.action)}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Summary */}
          {feedback?.summary?.headline && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>{clean(feedback.summary.headline)}</Text>
            </View>
          )}

          {!feedback && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>
                {finalScore >= 8
                  ? 'Excellent performance! You demonstrated strong communication skills and technical knowledge.'
                  : finalScore >= 6
                  ? 'Good effort! Work on providing more specific examples and elaborating your answers.'
                  : 'Keep practicing! Focus on understanding questions better and providing structured responses.'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonsFade }]}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { Speech.stop(); router.push('/welcome'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.retryButtonText}>Practice Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => { Speech.stop(); router.push('/'); }}
            activeOpacity={0.7}
          >
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statLabelOld}>{label}</Text>
        <Text style={styles.statValueOld}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.textPrimary,
  },
  headerBadge: {
    backgroundColor: C.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
  // Score
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreCircleOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: -2,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  // Badge
  badgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  passedBadge: {
    backgroundColor: C.successLight,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.success + '40',
  },
  passedText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.successDark,
    letterSpacing: 0.5,
  },
  failedBadge: {
    backgroundColor: C.dangerLight,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.danger + '40',
  },
  failedText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.dangerDark,
    letterSpacing: 0.5,
  },
  // Stats Grid
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Sections
  section: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  strengthSection: {
    borderLeftWidth: 3,
    borderLeftColor: C.success,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 14,
  },
  dimensionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dimensionIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  dimensionContent: {
    flex: 1,
  },
  dimensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dimensionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  dimensionScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: C.surfaceAlt,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  dimensionFeedback: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 17,
  },
  // Lists
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  bulletSuccess: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.success,
    marginTop: 5,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  listText: {
    fontSize: 13,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  // Roadmap
  roadmapSection: {
    backgroundColor: C.warningLight,
    borderLeftWidth: 3,
    borderLeftColor: C.warning,
    borderColor: C.warning + '20',
  },
  roadmapSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.warningDark,
    marginBottom: 8,
    marginTop: 6,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  roadmapText: {
    fontSize: 13,
    color: C.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  // Summary
  summarySection: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: C.primaryBg,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 20,
  },
  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 8,
    gap: 12,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: C.primary,
    elevation: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textOnPrimary,
  },
  homeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  homeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textSecondary,
  },
  // Legacy stat item
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statLabelOld: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 2,
  },
  statValueOld: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
});
