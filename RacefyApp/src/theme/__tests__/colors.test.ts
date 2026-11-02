import { darkColors, lightColors, ThemeColors } from '../colors';
import { contrastRatio, withAlpha } from '../color';

/**
 * Pairs that must stay readable in every palette — base or seasonal. The
 * same thresholds will gate a server-delivered theme (plan: Faza 2).
 * 4.5 = WCAG AA body text; 3.0 = AA for large text / UI components.
 */
const PAIRS: [keyof ThemeColors, keyof ThemeColors, number][] = [
  ['textPrimary', 'background', 4.5],
  ['textPrimary', 'cardBackground', 4.5],
  ['textSecondary', 'cardBackground', 4.5],
  ['textMuted', 'cardBackground', 2.5], // hints only; gray-400 on white is 2.54 today
  ['onPrimary', 'primary', 2.5], // white on emerald — brand decision, see colors.ts
  ['error', 'cardBackground', 3.0],
  ['routeAccent', 'cardBackground', 3.0],
];

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
])('%s palette contrast', (_name, palette) => {
  it.each(PAIRS)('%s on %s ≥ %s', (fg, bg, min) => {
    expect(contrastRatio(palette[fg] as string, palette[bg] as string)).toBeGreaterThanOrEqual(min);
  });
});

describe('withAlpha', () => {
  it('turns a hex token into rgba', () => {
    expect(withAlpha('#10b981', 0.25)).toBe('rgba(16, 185, 129, 0.25)');
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });
  it('leaves non-hex input alone', () => {
    expect(withAlpha('transparent', 0.5)).toBe('transparent');
  });
});
