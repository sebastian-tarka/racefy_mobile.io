export const colors = {
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

export type ColorName = keyof typeof colors;
