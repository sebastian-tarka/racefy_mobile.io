// Light theme colors
export const lightColors = {
  // Primary colors
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#34d399',

  // Background colors
  background: '#f8fafb',
  cardBackground: '#ffffff',
  cardBackgroundHighlight: '#f0fdf4', // Light emerald tint for unread notifications

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Border colors
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.04)',

  // Status colors
  error: '#ef4444',
  errorLight: '#fef2f2',
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  info: '#3b82f6',
  infoLight: '#eff6ff',

  // AI/Draft badge colors
  ai: '#6B21A8',
  aiLight: '#F3E8FF',
  draft: '#92400E',
  draftLight: '#FEF3C7',
  draftBorder: '#FCD34D',

  // Event status badges
  upcoming: {
    bg: '#ecfdf5',
    text: '#047857',
  },
  ongoing: {
    bg: '#eff6ff',
    text: '#1d4ed8',
  },
  completed: {
    bg: '#f3f4f6',
    text: '#4b5563',
  },
  cancelled: {
    bg: '#fef2f2',
    text: '#dc2626',
  },

  // Misc
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  orange: '#f59e0b',
};

// Dark theme colors — deep navy palette (not gray)
export const darkColors = {
  // Primary colors (same vibrant primary)
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#34d399',

  // Background colors — deep navy tones
  background: '#0f1729',
  cardBackground: '#162032',
  cardBackgroundHighlight: '#14532d', // Dark emerald tint for unread notifications

  // Text colors — brighter for navy backgrounds
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',

  // Border colors — subtle white borders for glass effect
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.04)',

  // Status colors
  error: '#f87171',
  errorLight: '#3b1520',
  success: '#34d399',
  successLight: '#0a2e1f',
  warning: '#fbbf24',
  warningLight: '#2e2008',
  info: '#60a5fa',
  infoLight: '#0f2340',

  // AI/Draft badge colors
  ai: '#A855F7',
  aiLight: '#3B0764',
  draft: '#FCD34D',
  draftLight: '#422006',
  draftBorder: '#78350F',

  // Event status badges
  upcoming: {
    bg: '#064e3b',
    text: '#6ee7b7',
  },
  ongoing: {
    bg: '#1e3a5f',
    text: '#93c5fd',
  },
  completed: {
    bg: '#1e2d42',
    text: '#cbd5e1',
  },
  cancelled: {
    bg: '#7f1d1d',
    text: '#fca5a5',
  },

  // Misc
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.75)',
  orange: '#f59e0b',
};

// Default export for backward compatibility
export const colors = lightColors;

export type ThemeColors = typeof lightColors;
export type ColorName = keyof typeof lightColors;
