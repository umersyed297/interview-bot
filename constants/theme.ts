/**
 * Professional Interview Bot Theme
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

/**
 * App-wide professional color palette
 */
export const AppColors = {
  // Primary brand colors
  primary: '#4F46E5',        // Indigo-600
  primaryLight: '#818CF8',   // Indigo-400
  primaryDark: '#3730A3',    // Indigo-800
  primaryBg: '#EEF2FF',      // Indigo-50

  // Accent
  accent: '#06B6D4',         // Cyan-500
  accentLight: '#67E8F9',    // Cyan-300
  accentBg: '#ECFEFF',       // Cyan-50

  // Success / Pass
  success: '#10B981',        // Emerald-500
  successLight: '#D1FAE5',   // Emerald-100
  successDark: '#065F46',    // Emerald-800

  // Warning
  warning: '#F59E0B',        // Amber-500
  warningLight: '#FEF3C7',   // Amber-100
  warningDark: '#92400E',    // Amber-800

  // Danger / Fail
  danger: '#EF4444',         // Red-500
  dangerLight: '#FEE2E2',   // Red-100
  dangerDark: '#991B1B',     // Red-800

  // Neutrals
  bg: '#F8FAFC',             // Slate-50
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',     // Slate-100
  border: '#E2E8F0',         // Slate-200
  borderLight: '#F1F5F9',    // Slate-100
  textPrimary: '#0F172A',    // Slate-900
  textSecondary: '#475569',  // Slate-600
  textMuted: '#94A3B8',      // Slate-400
  textOnPrimary: '#FFFFFF',

  // Card shadow
  shadow: '#0F172A',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
