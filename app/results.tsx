import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:3000';

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const finalScore = params.finalScore ? parseFloat(String(params.finalScore)) : 0;
  const passed = params.passed === 'true';
  const questionCount = params.questionCount ? parseInt(String(params.questionCount)) : 0;
  const duration = params.duration ? parseInt(String(params.duration)) : 0;
  const sessionId = params.sessionId ? String(params.sessionId) : '';

  // Feedback data from backend
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      fetchFeedback();
    }
  }, [sessionId]);

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
    if (score >= 8) return '#34C759';
    if (score >= 6) return '#FF9500';
    return '#FF3B30';
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Interview Results</Text>
          {feedback?.summary?.tier && (
            <Text style={styles.headerBadge}>
              {feedback.summary.tier.emoji} {feedback.summary.tier.label}
            </Text>
          )}
        </View>

        {/* Score Circle */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(finalScore) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(finalScore) }]}>
              {Math.round(finalScore * 10) / 10}
            </Text>
            <Text style={styles.scoreLabel}>/10</Text>
          </View>

          <Text style={[styles.gradeText, { color: getScoreColor(finalScore) }]}>
            {getGradeLabel(finalScore)}
          </Text>

          {passed ? (
            <View style={styles.passedBadge}>
              <Text style={styles.passedText}>✅ PASSED</Text>
            </View>
          ) : (
            <View style={styles.failedBadge}>
              <Text style={styles.failedText}>❌ NEEDS IMPROVEMENT</Text>
            </View>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <StatItem icon="❓" label="Questions Asked" value={questionCount.toString()} />
          <StatItem icon="⏱️" label="Interview Duration" value={formatDuration(duration)} />
          <StatItem icon={passed ? '✅' : '📚'} label="Status" value={passed ? 'Qualified' : 'Continue Practice'} />
          {feedback?.difficultyProgression && (
            <StatItem
              icon="📈"
              label="Difficulty Progression"
              value={`Level ${feedback.difficultyProgression.startLevel} → ${feedback.difficultyProgression.endLevel} (${feedback.difficultyProgression.trajectory})`}
            />
          )}
        </View>

        {/* Dimension Breakdown */}
        {feedback?.dimensions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Skill Breakdown</Text>
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
                  <Text style={styles.dimensionFeedback}>{dim.feedback}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Strengths */}
        {feedback?.strengths && feedback.strengths.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Top Strengths</Text>
            {feedback.strengths.map((s: any, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>✅</Text>
                <Text style={styles.listText}>{s.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Areas for Improvement */}
        {feedback?.improvements && feedback.improvements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Areas to Improve</Text>
            {feedback.improvements.map((imp: any, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>
                  {imp.priority === 'high' ? '🔴' : imp.priority === 'medium' ? '🟡' : '🟢'}
                </Text>
                <Text style={styles.listText}>{imp.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Improvement Roadmap */}
        {feedback?.roadmap?.immediate && feedback.roadmap.immediate.length > 0 && (
          <View style={[styles.section, styles.roadmapSection]}>
            <Text style={styles.sectionTitle}>🗺️ Your Improvement Roadmap</Text>
            <Text style={styles.roadmapSubtitle}>This Week:</Text>
            {feedback.roadmap.immediate.map((item: any, i: number) => (
              <View key={i} style={styles.roadmapItem}>
                <Text style={styles.roadmapPriority}>
                  {item.priority === 'high' ? '🔥' : '📌'}
                </Text>
                <Text style={styles.roadmapText}>{item.action}</Text>
              </View>
            ))}
            {feedback.roadmap.shortTerm && feedback.roadmap.shortTerm.length > 0 && (
              <>
                <Text style={styles.roadmapSubtitle}>This Month:</Text>
                {feedback.roadmap.shortTerm.map((item: any, i: number) => (
                  <View key={i} style={styles.roadmapItem}>
                    <Text style={styles.roadmapPriority}>📅</Text>
                    <Text style={styles.roadmapText}>{item.action}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Headline Summary */}
        {feedback?.summary?.headline && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackTitle}>Performance Summary</Text>
            <Text style={styles.feedbackText}>{feedback.summary.headline}</Text>
          </View>
        )}

        {!feedback && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackTitle}>Performance Summary</Text>
            <Text style={styles.feedbackText}>
              {finalScore >= 8
                ? 'Excellent performance! You demonstrated strong communication skills and technical knowledge.'
                : finalScore >= 6
                ? 'Good effort! Work on providing more specific examples and elaborating your answers.'
                : 'Keep practicing! Focus on understanding questions better and providing structured responses.'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retryButton]}
            onPress={() => router.push('/welcome')}
          >
            <Text style={styles.retryButtonText}>Practice Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.homeButton]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  gradeText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  passedBadge: {
    backgroundColor: '#D1F4E0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  passedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  failedBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  failedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  dimensionRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  dimensionIcon: {
    fontSize: 20,
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
    color: '#333',
  },
  dimensionScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f0f0f0',
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
    color: '#666',
    lineHeight: 17,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listBullet: {
    fontSize: 14,
    marginRight: 10,
    marginTop: 1,
  },
  listText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
    lineHeight: 19,
  },
  roadmapSection: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  roadmapSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
    marginTop: 4,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  roadmapPriority: {
    fontSize: 14,
    marginRight: 10,
  },
  roadmapText: {
    fontSize: 13,
    color: '#444',
    flex: 1,
    lineHeight: 19,
  },
  feedbackSection: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#E8F4FD',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    borderRadius: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 19,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  homeButton: {
    backgroundColor: '#F0F0F0',
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
