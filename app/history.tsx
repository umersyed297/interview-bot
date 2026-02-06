import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:3000';

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
    if (score >= 8) return '#34C759';
    if (score >= 6) return '#FF9500';
    return '#FF3B30';
  };

  const renderSession = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.sessionCard}
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
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) + '20', borderColor: getScoreColor(item.score) }]}>
          <Text style={[styles.scoreBadgeText, { color: getScoreColor(item.score) }]}>
            {item.score}/10
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
        <Text style={item.passed ? styles.passTag : styles.failTag}>
          {item.passed ? '✅' : '❌'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interview History</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Profile Summary */}
      {profile && profile.totalInterviews > 0 && (
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{profile.totalInterviews}</Text>
              <Text style={styles.profileStatLabel}>Interviews</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatNum, { color: getScoreColor(profile.averageScore) }]}>
                {profile.averageScore}
              </Text>
              <Text style={styles.profileStatLabel}>Avg Score</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatNum}>{profile.passRate}%</Text>
              <Text style={styles.profileStatLabel}>Pass Rate</Text>
            </View>
            <View style={styles.profileStat}>
              <Text style={[styles.profileStatNum, { color: '#34C759' }]}>{profile.bestScore}</Text>
              <Text style={styles.profileStatLabel}>Best</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Interviews Yet</Text>
          <Text style={styles.emptySubtitle}>Complete your first interview to see history here</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/welcome')}>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileRow: { flexDirection: 'row', justifyContent: 'space-around' },
  profileStat: { alignItems: 'center' },
  profileStatNum: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  profileStatLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionLeft: { marginRight: 12 },
  scoreBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '700' },
  sessionCenter: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '600', color: '#333' },
  sessionMeta: { fontSize: 12, color: '#999', marginTop: 3 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passTag: { fontSize: 18 },
  failTag: { fontSize: 18 },
  chevron: { fontSize: 22, color: '#ccc', fontWeight: '300' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  startBtn: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  startBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
