import { ms } from './scale';

export const spacing = {
  xs: ms(4),
  sm: ms(8),
  md: ms(12),
  lg: ms(16),
  xl: ms(20),
  xxl: ms(24),
  xxxl: ms(32),
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: ms(10),
  sm: ms(12),
  md: ms(14),
  lg: ms(16),
  xl: ms(18),
  xxl: ms(20),
  xxxl: ms(24),
  title: ms(28),
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const avatarSizes = {
  sm: ms(32),
  md: ms(40),
  lg: ms(48),
  xl: ms(64),
  xxl: ms(80),
};
