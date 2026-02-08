import {
    buildProfileFromResume,
    deleteProfile,
    loadProfile,
    saveProfile,
    UserProfile,
} from '@/utils/profile-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfileData();
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const loadProfileData = async () => {
    const p = await loadProfile();
    setProfile(p);
    if (p) setNameInput(p.name);
    setLoading(false);
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      const response = await fetch(`${API_URL}/api/resume/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const newProfile = buildProfileFromResume(data.summary, file.name);
        // Keep user's manually-set name if they already edited it
        if (profile?.name) newProfile.name = profile.name;
        await saveProfile(newProfile);
        setProfile(newProfile);
        setNameInput(newProfile.name);
        const nameMsg = newProfile.name ? ` Name detected: ${newProfile.name}.` : '';
        Alert.alert('Profile Updated', `Found ${data.summary.totalSkills} skills.${nameMsg}`);
      } else {
        Alert.alert('Upload Failed', data.error || 'Could not process resume');
      }
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!profile) return;
    const updated = { ...profile, name: nameInput.trim(), updatedAt: new Date().toISOString() };
    await saveProfile(updated);
    setProfile(updated);
    setEditingName(false);
  };

  const handleDeleteProfile = () => {
    Alert.alert('Delete Profile', 'This will remove your profile data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProfile();
          setProfile(null);
          setNameInput('');
        },
      },
    ]);
  };

  const getLevelColor = (level: string) => {
    if (level === 'senior') return '#EF4444';
    if (level === 'mid') return '#F59E0B';
    return '#10B981';
  };

  const getLevelLabel = (level: string) => {
    if (level === 'senior') return 'Senior';
    if (level === 'mid') return 'Mid-Level';
    return 'Junior';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeIn }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'<'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {!profile ? (
            /* No profile — prompt to create */
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Text style={styles.emptyIcon}>👤</Text>
              </View>
              <Text style={styles.emptyTitle}>No Profile Yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload your resume to automatically build your profile
              </Text>
              <TouchableOpacity
                style={[styles.uploadBtn, isUploading && { opacity: 0.6 }]}
                onPress={handleUploadResume}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={C.textOnPrimary} />
                ) : (
                  <Text style={styles.uploadBtnText}>Upload Resume</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Profile exists — show details */
            <>
              {/* Avatar & Name */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(profile.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder="Enter your name"
                      placeholderTextColor={C.textMuted}
                      autoFocus
                    />
                    <TouchableOpacity onPress={handleSaveName} style={styles.nameSaveBtn}>
                      <Text style={styles.nameSaveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditingName(true)}>
                    <Text style={styles.profileName}>
                      {profile.name || 'Tap to set name'}
                    </Text>
                    <Text style={styles.profileNameHint}>Tap to edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Experience Badge */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Experience</Text>
                  <View style={[styles.levelBadge, { backgroundColor: getLevelColor(profile.experienceLevel) + '20' }]}>
                    <Text style={[styles.levelBadgeText, { color: getLevelColor(profile.experienceLevel) }]}>
                      {getLevelLabel(profile.experienceLevel)}
                      {profile.estimatedYears ? ` · ${profile.estimatedYears}+ yrs` : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Skills */}
              {profile.topSkills.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Top Skills</Text>
                  <View style={styles.tagRow}>
                    {profile.topSkills.slice(0, 8).map((skill, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Expertise */}
              {profile.topExpertise.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Expertise</Text>
                  <View style={styles.tagRow}>
                    {profile.topExpertise.map((exp, i) => (
                      <View key={i} style={[styles.tag, { backgroundColor: C.primaryBg, borderColor: C.primaryLight + '40' }]}>
                        <Text style={[styles.tagText, { color: C.primary }]}>{exp}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Education */}
              {profile.education.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Education</Text>
                  {profile.education.map((deg, i) => (
                    <Text key={i} style={styles.educationText}>🎓 {deg}</Text>
                  ))}
                </View>
              )}

              {/* Resume File */}
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View>
                    <Text style={styles.cardLabel}>Resume</Text>
                    <Text style={styles.resumeFile}>{profile.resumeFileName}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, isUploading && { opacity: 0.6 }]}
                    onPress={handleUploadResume}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <Text style={styles.smallBtnText}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Profile */}
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteProfile}>
                <Text style={styles.deleteBtnText}>Delete Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: C.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 28, paddingHorizontal: 40 },
  uploadBtn: {
    backgroundColor: C.primary, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 14, elevation: 4, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: C.textOnPrimary },
  // Avatar section
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: C.textOnPrimary },
  profileName: { fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center' },
  profileNameHint: { fontSize: 11, color: C.textMuted, textAlign: 'center', marginTop: 2 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  nameInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 16,
    color: C.textPrimary, minWidth: 180, backgroundColor: C.surface,
  },
  nameSaveBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  nameSaveBtnText: { fontSize: 14, fontWeight: '600', color: C.textOnPrimary },
  // Cards
  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  levelBadgeText: { fontSize: 13, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  educationText: { fontSize: 14, color: C.textSecondary, marginBottom: 4 },
  resumeFile: { fontSize: 13, color: C.textSecondary, marginTop: -4 },
  smallBtn: {
    borderWidth: 1, borderColor: C.primary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  smallBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  deleteBtn: {
    alignItems: 'center', paddingVertical: 14, marginTop: 8,
    borderRadius: 12, borderWidth: 1, borderColor: C.danger + '40',
    backgroundColor: C.dangerLight,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: C.danger },
});
