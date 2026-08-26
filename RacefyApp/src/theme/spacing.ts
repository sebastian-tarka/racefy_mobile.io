import { FONT_CAP, ms, msFont } from './scale';

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

/**
 * Text sizes. All steps share the same font-scale cap so the hierarchy scales as
 * one — see `FONT_CAP` in ./scale for why per-step caps are a trap.
 *
 * Always prefer these over a raw number: a hardcoded `fontSize: 14` bypasses the
 * cap and will overflow its container at large system font sizes.
 */
export const fontSize = {
  xs: msFont(10),
  sm: msFont(12),
  md: msFont(14),
  lg: msFont(16),
  xl: msFont(18),
  xxl: msFont(20),
  xxxl: msFont(24),
  title: msFont(28),
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

export const iconSize = {
  xs: ms(14),
  sm: ms(16),
  md: ms(20),
  lg: ms(24),
  xl: ms(32),
  xxl: ms(48),
};

export const componentSize = {
  buttonMinHeight: ms(48),
  inputHeight: ms(48),
  controlButton: ms(88),
  startButton: ms(160),
  cardWidth: ms(200),
  cardWidthSm: ms(160),
  sportBadge: ms(36),
  // Standalone hero numbers — tighter cap, they break layout before anything else.
  heroTimerFont: msFont(72, FONT_CAP.display),
  heroStatFont: msFont(48, FONT_CAP.display),
  platformIcon: ms(40),
};
