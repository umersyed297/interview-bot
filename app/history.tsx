import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
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
  primaryBg: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
};

interface HistoryItem {
  sessionId: string;
  date: string;
  score: number;
  passed: boolean;
  questionCount: number;
  duration: number;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/candidate/anonymous`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.candidate);
        setSessions(
          (data.sessions || []).map((s: any) => ({
            sessionId: s.id || s.sessionId,
            date: s.savedAt || s.date,
            score: s.finalScore || 0,
            passed: s.passed || false,
            questionCount: s.questionCount || 0,
            duration: s.duration || 0,
          }))
        );
      }
    } catch (e) {
      console.log('Error fetching history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const renderSession = ({ item, index }: { item: HistoryItem; index: number }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
    <TouchableOpacity
      style={styles.sessionCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/results',
          params: {
            finalScore: String(item.score),
            passed: item.passed ? 'true' : 'false',
            questionCount: String(item.questionCount),
            duration: String(item.duration),
            sessionId: item.sessionId,
          },
        })
      }
    >
      <View style={styles.sessionLeft}>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreBg(item.score), borderColor: getScoreColor(item.score) }]}>
          <Text style={[styles.scoreBadgeText, { color: getScoreColor(item.score) }]}>
            {item.score}
          </Text>
        </View>
      </View>
      <View style={styles.sessionCenter}>
        <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
        <Text style={styles.sessionMeta}>
          {item.questionCount} questions · {formatDuration(item.duration)}
        </Text>
      </View>
      <View style={styles.sessionRight}>
        <View style={[styles.statusDot, { backgroundColor: item.passed ? C.success : C.danger }]} />
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>{'<'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Profile Summary */}
      {profile && profile.totalInterviews > 0 && (
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>
          <View style={styles.profileRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{profile.totalInterviews}</Text>
              <Text style={styles.profileStatLabel}>Interviews</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatNum, { color: getScoreColor(profile.averageScore) }]}>
                {profile.averageScore}
              </Text>
              <Text style={styles.profileStatLabel}>Avg Score</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{profile.passRate}%</Text>
              <Text style={styles.profileStatLabel}>Pass Rate</Text>
            </View>
            <View style={styles.profileDivider} />
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatNum, { color: C.success }]}>{profile.bestScore}</Text>
              <Text style={styles.profileStatLabel}>Best</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIconBg}>
            <Text style={styles.emptyIcon}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>No Interviews Yet</Text>
          <Text style={styles.emptySubtitle}>Complete your first interview to see history here</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/welcome')} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>Start Interview</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.sessionId}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { fontSize: 15, color: C.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  profileRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  profileStat: { alignItems: 'center', flex: 1 },
  profileStatNum: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  profileStatLabel: { fontSize: 10, color: C.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500' },
  profileDivider: { width: 1, height: 30, backgroundColor: C.border },
  listContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  sessionLeft: { marginRight: 14 },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: { fontSize: 16, fontWeight: '800' },
  sessionCenter: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  sessionMeta: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chevron: { fontSize: 22, color: C.textMuted, fontWeight: '300' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: C.textSecondary },
  emptyIconBg: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: C.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  startBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, elevation: 4, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
