import * as FileSystem from 'expo-file-system/legacy';

const PROFILE_PATH = FileSystem.documentDirectory + 'user-profile.json';

export interface UserProfile {
  name: string;
  experienceLevel: string;
  estimatedYears: number | null;
  topSkills: string[];
  topExpertise: string[];
  education: string[];
  achievements: string[];
  resumeFileName: string;
  resumeText: string;
  createdAt: string;
  updatedAt: string;
}

export async function loadProfile(): Promise<UserProfile | null> {
  try {
    const info = await FileSystem.getInfoAsync(PROFILE_PATH);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(PROFILE_PATH);
    return JSON.parse(content) as UserProfile;
  } catch (e) {
    console.log('Failed to load profile:', e);
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(PROFILE_PATH, JSON.stringify(profile));
  } catch (e) {
    console.log('Failed to save profile:', e);
  }
}

export async function deleteProfile(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(PROFILE_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(PROFILE_PATH);
    }
  } catch (e) {
    console.log('Failed to delete profile:', e);
  }
}

export function buildProfileFromResume(
  summary: {
    totalSkills: number;
    topSkills: string[];
    experienceLevel: string;
    estimatedYears: number | null;
    topExpertise: string[];
    education: { degrees: string[]; isCSRelated: boolean; hasDegree: boolean };
    achievements: string[];
    candidateName?: string;
  },
  fileName: string
): UserProfile {
  const now = new Date().toISOString();
  return {
    name: summary.candidateName || '',
    experienceLevel: summary.experienceLevel,
    estimatedYears: summary.estimatedYears,
    topSkills: summary.topSkills,
    topExpertise: summary.topExpertise,
    education: summary.education?.degrees || [],
    achievements: summary.achievements || [],
    resumeFileName: fileName,
    resumeText: [
      `Skills: ${summary.topSkills.join(', ')}`,
      `Experience: ${summary.experienceLevel}${summary.estimatedYears ? ` (${summary.estimatedYears} years)` : ''}`,
      `Expertise: ${summary.topExpertise.join(', ')}`,
      summary.achievements.length > 0 ? `Achievements: ${summary.achievements.join('; ')}` : '',
      summary.education?.degrees?.length > 0 ? `Education: ${summary.education.degrees.join(', ')}` : '',
    ].filter(Boolean).join(' | '),
    createdAt: now,
    updatedAt: now,
  };
}
