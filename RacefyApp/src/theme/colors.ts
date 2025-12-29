// Light theme colors
export const lightColors = {
  // Primary colors
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#34d399',

  // Background colors
  background: '#f9fafb',
  cardBackground: '#ffffff',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Status colors
  error: '#ef4444',
  errorLight: '#fef2f2',
  success: '#10b981',
  successLight: '#ecfdf5',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  info: '#3b82f6',
  infoLight: '#eff6ff',

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
};

// Dark theme colors
export const darkColors = {
  // Primary colors (same vibrant primary)
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#34d399',

  // Background colors
  background: '#111827',
  cardBackground: '#1f2937',

  // Text colors
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',

  // Border colors
  border: '#374151',
  borderLight: '#1f2937',

  // Status colors
  error: '#f87171',
  errorLight: '#7f1d1d',
  success: '#34d399',
  successLight: '#064e3b',
  warning: '#fbbf24',
  warningLight: '#78350f',
  info: '#60a5fa',
  infoLight: '#1e3a5f',

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
    bg: '#374151',
    text: '#d1d5db',
  },
  cancelled: {
    bg: '#7f1d1d',
    text: '#fca5a5',
  },

  // Misc
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// Default export for backward compatibility
export const colors = lightColors;

export type ThemeColors = typeof lightColors;
export type ColorName = keyof typeof lightColors;
