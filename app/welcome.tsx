import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:3000';

interface ResumeSummary {
  totalSkills: number;
  topSkills: string[];
  experienceLevel: string;
  estimatedYears: number | null;
  topExpertise: string[];
  education: { degrees: string[]; isCSRelated: boolean; hasDegree: boolean };
  achievements: string[];
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeSummary, setResumeSummary] = useState<ResumeSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeText, setResumeText] = useState('');

  const handleStart = () => {
    router.push({
      pathname: '/(tabs)',
      params: resumeText ? { resumeText } : {},
    });
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setIsUploading(true);
      setResumeFileName(file.name);

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
        setResumeUploaded(true);
        setResumeSummary(data.summary);
        setResumeText(
          [
            `Skills: ${data.summary.topSkills.join(', ')}`,
            `Experience: ${data.summary.experienceLevel}${data.summary.estimatedYears ? ` (${data.summary.estimatedYears} years)` : ''}`,
            `Expertise: ${data.summary.topExpertise.join(', ')}`,
            data.summary.achievements.length > 0 ? `Achievements: ${data.summary.achievements.join('; ')}` : '',
            data.summary.education?.degrees?.length > 0 ? `Education: ${data.summary.education.degrees.join(', ')}` : '',
          ].filter(Boolean).join('\n')
        );
        Alert.alert('✅ Resume Uploaded', `Found ${data.summary.totalSkills} skills. Interview will be customized based on your resume!`);
      } else {
        Alert.alert('Upload Failed', data.error || 'Could not process resume');
      }
    } catch (error: any) {
      console.error('Resume upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload resume. Make sure the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearResume = () => {
    setResumeUploaded(false);
    setResumeFileName('');
    setResumeSummary(null);
    setResumeText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🎯</Text>
          <Text style={styles.logoText}>Interview Bot</Text>
          <Text style={styles.madeBy}>Made by Syed Umer</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title}>Professional Interview Preparation</Text>
          <Text style={styles.subtitle}>
            Practice with an AI interviewer and get instant feedback
          </Text>

          {/* Resume Upload Section */}
          <View style={styles.resumeSection}>
            <Text style={styles.sectionTitle}>📄 Upload Your Resume</Text>
            <Text style={styles.resumeHint}>
              Upload your resume (PDF/TXT) to get personalized interview questions based on your skills
            </Text>

            {!resumeUploaded ? (
              <TouchableOpacity
                style={[styles.uploadButton, isUploading && styles.buttonDisabled]}
                onPress={handleUploadResume}
                disabled={isUploading}
              >
                {isUploading ? (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.uploadButtonText}>Analyzing Resume...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.uploadIcon}>📎</Text>
                    <Text style={styles.uploadButtonText}>Choose PDF or Text File</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.resumeCard}>
                <View style={styles.resumeCardHeader}>
                  <Text style={styles.resumeCardIcon}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resumeCardTitle}>Resume Loaded</Text>
                    <Text style={styles.resumeCardFile}>{resumeFileName}</Text>
                  </View>
                  <TouchableOpacity onPress={clearResume}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {resumeSummary && (
                  <View style={styles.resumeDetails}>
                    <View style={styles.resumeDetailRow}>
                      <Text style={styles.resumeDetailLabel}>Experience:</Text>
                      <Text style={styles.resumeDetailValue}>
                        {resumeSummary.experienceLevel === 'senior' ? '🔴 Senior' :
                         resumeSummary.experienceLevel === 'mid' ? '🟡 Mid-Level' : '🟢 Junior'}
                        {resumeSummary.estimatedYears ? ` (${resumeSummary.estimatedYears}+ yrs)` : ''}
                      </Text>
                    </View>
                    <View style={styles.resumeDetailRow}>
                      <Text style={styles.resumeDetailLabel}>Skills ({resumeSummary.totalSkills}):</Text>
                      <Text style={styles.resumeDetailValue} numberOfLines={2}>
                        {resumeSummary.topSkills.slice(0, 6).join(', ')}
                      </Text>
                    </View>
                    {resumeSummary.topExpertise.length > 0 && (
                      <View style={styles.resumeDetailRow}>
                        <Text style={styles.resumeDetailLabel}>Expertise:</Text>
                        <Text style={styles.resumeDetailValue}>
                          {resumeSummary.topExpertise.join(', ')}
                        </Text>
                      </View>
                    )}
                    {resumeSummary.achievements.length > 0 && (
                      <View style={styles.resumeDetailRow}>
                        <Text style={styles.resumeDetailLabel}>Achievements:</Text>
                        <Text style={styles.resumeDetailValue} numberOfLines={2}>
                          {resumeSummary.achievements[0]}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.resumeNote}>
                      🎯 Interview questions will be tailored to your profile
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Features list */}
          <View style={styles.featuresContainer}>
            <FeatureItem icon="✅" text="Real-time speech recognition" />
            <FeatureItem icon="🎤" text="Professional interviewer questions" />
            <FeatureItem icon="📄" text="Resume-based personalized questions" />
            <FeatureItem icon="📊" text="Multi-dimensional scoring (0-10)" />
            <FeatureItem icon="📈" text="Adaptive difficulty (Easy → Hard)" />
            <FeatureItem icon="🧠" text="Skill gap detection & roadmap" />
            <FeatureItem icon="📋" text="Detailed feedback & improvement tips" />
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>
            {resumeUploaded ? '🚀 Start Personalized Interview' : 'Start Interview'}
          </Text>
        </TouchableOpacity>

        {/* History Button */}
        <TouchableOpacity style={styles.historyButton} onPress={() => router.push('/history')}>
          <Text style={styles.historyButtonText}>📋 View Interview History</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>Professional Interview Simulator</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  madeBy: {
    marginTop: 6,
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E8F4FD',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featuresContainer: {
    marginTop: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  startButton: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  historyButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  // Resume Upload Styles
  resumeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  resumeHint: {
    fontSize: 13,
    color: '#777',
    marginBottom: 12,
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: '#F0F7FF',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadIcon: {
    fontSize: 20,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  resumeCard: {
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C6F6D5',
    overflow: 'hidden',
  },
  resumeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  resumeCardIcon: {
    fontSize: 20,
  },
  resumeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#276749',
  },
  resumeCardFile: {
    fontSize: 12,
    color: '#68D391',
    marginTop: 2,
  },
  removeText: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  resumeDetails: {
    padding: 12,
    paddingTop: 0,
    gap: 6,
  },
  resumeDetailRow: {
    flexDirection: 'row',
    gap: 6,
  },
  resumeDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    minWidth: 80,
  },
  resumeDetailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  resumeNote: {
    fontSize: 12,
    color: '#276749',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },
});
