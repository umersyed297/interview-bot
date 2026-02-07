import {
    buildProfileFromResume,
    loadProfile,
    saveProfile,
    UserProfile,
} from '@/utils/profile-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:3000';

const C = {
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#065F46',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
};

const DOMAINS = [
  { id: 'general', label: 'General', icon: '🎯', desc: 'All-round interview' },
  { id: 'web-dev', label: 'Web Dev', icon: '🌐', desc: 'Frontend & Backend' },
  { id: 'mobile-dev', label: 'Mobile Dev', icon: '📱', desc: 'iOS & Android' },
  { id: 'data-science', label: 'Data Science', icon: '📊', desc: 'ML & Analytics' },
  { id: 'devops', label: 'DevOps', icon: '⚙️', desc: 'CI/CD & Cloud' },
  { id: 'teaching', label: 'Teaching', icon: '📚', desc: 'Education roles' },
  { id: 'cybersecurity', label: 'Security', icon: '🔒', desc: 'InfoSec & Pen testing' },
  { id: 'product', label: 'Product', icon: '💡', desc: 'PM & Strategy' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('general');
  const [customDomain, setCustomDomain] = useState('');
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;

  // Reload profile every time screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProfile().then((p) => {
        setProfile(p);
        setProfileLoading(false);
      });
    }, [])
  );

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const activeDomain = selectedDomain === 'custom' ? customDomain.trim() : selectedDomain;

  const handleStart = () => {
    router.push({
      pathname: '/(tabs)',
      params: {
        ...(profile?.resumeText ? { resumeText: profile.resumeText } : {}),
        domain: activeDomain || 'general',
      },
    });
  };

  const handleSelectDomain = (id: string) => {
    setSelectedDomain(id);
    if (id !== 'custom') setCustomDomain('');
    setShowDomainDropdown(false);
  };

  const getSelectedLabel = () => {
    if (selectedDomain === 'custom') return customDomain || 'Type your domain...';
    return DOMAINS.find(d => d.id === selectedDomain)?.label || 'General';
  };

  const getSelectedIcon = () => {
    if (selectedDomain === 'custom') return '✏️';
    return DOMAINS.find(d => d.id === selectedDomain)?.icon || '🎯';
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
        const nameMsg = newProfile.name ? `Welcome, ${newProfile.name}! ` : '';
        Alert.alert('Profile Built', `${nameMsg}Found ${data.summary.totalSkills} skills from your resume.`);
      } else {
        Alert.alert('Upload Failed', data.error || 'Could not process resume');
      }
    } catch (e: any) {
      Alert.alert('Upload Error', 'Failed to upload resume. Make sure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const getLevelLabel = (level: string) => {
    if (level === 'senior') return 'Senior';
    if (level === 'mid') return 'Mid-Level';
    return 'Junior';
  };

  const isFirstTime = !profileLoading && !profile;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.hero, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoBg}>
            <Text style={styles.logoIcon}>🎯</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.titleBlock, { opacity: fadeAnim, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.appName}>Interview Bot</Text>
          <Text style={styles.tagline}>AI-Powered Interview Practice</Text>
        </Animated.View>

        {profileLoading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ── Profile Card / First-time Resume Prompt ── */}
            {isFirstTime ? (
              <View style={styles.firstTimeCard}>
                <View style={styles.firstTimeIconBg}>
                  <Text style={{ fontSize: 28 }}>👋</Text>
                </View>
                <Text style={styles.firstTimeTitle}>Welcome!</Text>
                <Text style={styles.firstTimeSubtitle}>
                  Upload your resume to auto-build your profile and get personalized interview questions.
                </Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, isUploading && { opacity: 0.6 }]}
                  onPress={handleUploadResume}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  {isUploading ? (
                    <View style={styles.uploadingRow}>
                      <ActivityIndicator size="small" color={C.textOnPrimary} />
                      <Text style={styles.uploadBtnText}>Analyzing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.uploadBtnText}>Upload Resume</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.skipHint}>Or skip and start a general interview below</Text>
              </View>
            ) : (
              /* Existing profile card */
              <TouchableOpacity
                style={styles.profileCard}
                onPress={() => router.push('/profile')}
                activeOpacity={0.7}
              >
                <View style={styles.profileRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {(profile!.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName}>{profile!.name || 'Set your name'}</Text>
                    <Text style={styles.profileMeta}>
                      {getLevelLabel(profile!.experienceLevel)}
                      {profile!.estimatedYears ? ` · ${profile!.estimatedYears}+ yrs` : ''}
                      {profile!.topSkills.length > 0 ? ` · ${profile!.topSkills.slice(0, 3).join(', ')}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.profileArrow}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Domain Selection ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Interview Domain</Text>
            </View>
            <View style={styles.domainSection}>
              {/* Dropdown trigger */}
              <TouchableOpacity
                style={styles.domainSelect}
                onPress={() => setShowDomainDropdown(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.domainSelectIcon}>{getSelectedIcon()}</Text>
                <Text style={[
                  styles.domainSelectText,
                  selectedDomain === 'custom' && !customDomain && { color: C.textMuted },
                ]}>{getSelectedLabel()}</Text>
                <Text style={styles.domainSelectArrow}>▾</Text>
              </TouchableOpacity>

              {/* Custom domain input (shown when 'custom' is selected) */}
              {selectedDomain === 'custom' && (
                <TextInput
                  style={styles.domainInput}
                  value={customDomain}
                  onChangeText={setCustomDomain}
                  placeholder="e.g. Blockchain, Game Dev, UI/UX..."
                  placeholderTextColor={C.textMuted}
                  autoFocus
                />
              )}
            </View>

            {/* Domain dropdown modal */}
            <Modal
              visible={showDomainDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDomainDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowDomainDropdown(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Domain</Text>
                  <FlatList
                    data={[...DOMAINS, { id: 'custom', label: 'Custom Domain', icon: '✏️', desc: 'Enter your own' }]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalOption,
                          selectedDomain === item.id && styles.modalOptionActive,
                        ]}
                        onPress={() => handleSelectDomain(item.id)}
                      >
                        <Text style={styles.modalOptionIcon}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.modalOptionLabel,
                            selectedDomain === item.id && styles.modalOptionLabelActive,
                          ]}>{item.label}</Text>
                          <Text style={styles.modalOptionDesc}>{item.desc}</Text>
                        </View>
                        {selectedDomain === item.id && (
                          <Text style={styles.modalCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {/* ── Action Buttons ── */}
            <View style={styles.buttonsSection}>
              <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
                <Text style={styles.startBtnText} numberOfLines={1}>{profile ? 'Start Personalized Interview' : 'Start Interview'}</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/history')} activeOpacity={0.7}>
                  <Text style={{ fontSize: 15 }}>📋</Text>
                  <Text style={styles.secondaryBtnText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/profile')} activeOpacity={0.7}>
                  <Text style={{ fontSize: 15 }}>👤</Text>
                  <Text style={styles.secondaryBtnText}>Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        <Text style={styles.footer}>Made by Syed Umer</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, paddingBottom: 30 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 40, paddingBottom: 6 },
  logoBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.primaryLight + '40',
  },
  logoIcon: { fontSize: 40 },
  titleBlock: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 20 },
  appName: { fontSize: 28, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5, marginTop: 12 },
  tagline: { fontSize: 14, fontWeight: '500', color: C.primary, marginTop: 4, letterSpacing: 0.3 },

  // First-time card
  firstTimeCard: {
    marginHorizontal: 20, backgroundColor: C.warningBg, borderRadius: 16,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.warning + '30', marginBottom: 20,
  },
  firstTimeIconBg: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  firstTimeTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  firstTimeSubtitle: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 16, paddingHorizontal: 8 },
  uploadBtn: {
    backgroundColor: C.primary, paddingVertical: 13, paddingHorizontal: 28,
    borderRadius: 12, elevation: 4, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: C.textOnPrimary },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipHint: { fontSize: 11, color: C.textMuted, marginTop: 10 },

  // Profile card
  profileCard: {
    marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: C.textOnPrimary },
  profileName: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  profileMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  profileArrow: { fontSize: 22, color: C.textMuted, fontWeight: '300' },

  // Domain selection
  sectionHeader: { paddingHorizontal: 22, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  domainSection: { paddingHorizontal: 20, marginBottom: 24 },
  domainSelect: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.border,
  },
  domainSelectIcon: { fontSize: 20, marginRight: 10 },
  domainSelectText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.textPrimary },
  domainSelectArrow: { fontSize: 14, color: C.textMuted, marginLeft: 4 },
  domainInput: {
    marginTop: 10, backgroundColor: C.surface, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.primary, fontSize: 15, color: C.textPrimary,
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: 28,
  },
  modalContent: {
    backgroundColor: C.surface, borderRadius: 16,
    paddingVertical: 16, maxHeight: 440,
    elevation: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700', color: C.textPrimary,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 20,
  },
  modalOptionActive: { backgroundColor: C.primaryBg },
  modalOptionIcon: { fontSize: 20, marginRight: 12 },
  modalOptionLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  modalOptionLabelActive: { color: C.primary },
  modalOptionDesc: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  modalCheckmark: { fontSize: 16, fontWeight: '700', color: C.primary, marginLeft: 8 },

  // Buttons
  buttonsSection: { paddingHorizontal: 20 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 28,
    backgroundColor: C.primary, borderRadius: 14, marginBottom: 10,
    elevation: 6, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  startBtnText: { fontSize: 16, fontWeight: '700', color: C.textOnPrimary, letterSpacing: 0.3 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, gap: 6,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },

  footer: { textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 28, marginBottom: 8 },
});
