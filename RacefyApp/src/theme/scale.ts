import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // iPhone SE/6/7/8 baseline

/**
 * Ratio bounds. Scaling handles the spread between real phones (320–430pt);
 * anything beyond that is a *layout* question (columns, max widths), not a
 * "make everything bigger" question — see .notes/RESPONSYWNOSC_PLAN.md.
 *
 * 1.15 sits just above the widest current phone (Pro Max, 430pt → 1.147), so no
 * existing phone is affected; it only stops the runaway growth on unfolded
 * foldables (673pt → 1.79) and tablets (1024pt → 2.73).
 *
 * 0.85 sits just below the narrowest real phone (iPhone SE 1st gen, 320pt →
 * 0.853), so that device is untouched too. It only guards against pathological
 * windows (Android split-screen / free-form) where text would become unreadable.
 * Deliberately NOT higher: raising the floor would make elements *larger* on the
 * narrowest screen, which is exactly where space is tightest.
 */
const MIN_RATIO = 0.85;
const MAX_RATIO = 1.15;

const scaleRatio = Math.min(Math.max(SCREEN_WIDTH / BASE_WIDTH, MIN_RATIO), MAX_RATIO);

/**
 * Caps on the *effective* system font scale.
 *
 * `text` is applied uniformly across the whole `fontSize` scale on purpose: a
 * single multiplier keeps the type hierarchy intact. Per-step caps (a tighter cap
 * on headings than on body) would let body text overtake headings at high font
 * scales — at fontScale 2.0 a 14pt body capped at 2.0 renders at 28pt while a
 * 20pt heading capped at 1.2 renders at only 24pt.
 *
 * `display` is tighter and reserved for standalone hero numbers (recording timer,
 * big stats). Those sit alone on their part of the screen, so shrinking them
 * relative to body text cannot invert any hierarchy — and they are the ones that
 * break layouts first.
 */
export const FONT_CAP = {
  text: 1.5,
  display: 1.2,
} as const;

const fontScale = PixelRatio.getFontScale();

/**
 * Moderated scale — adjusts value proportionally to screen width
 * but only applies half the difference to prevent extreme scaling.
 * factor: 0 = no scaling, 1 = full linear scaling, 0.5 = moderate (default)
 */
export function ms(size: number, factor: number = 0.5): number {
  return Math.round(size + (size * scaleRatio - size) * factor);
}

/**
 * Like `ms()`, but additionally caps how far the *system* font scale can enlarge
 * the result. React Native renders `fontSize * fontScale`, so dividing the size
 * back down by the excess keeps the effective size at `base * cap`.
 *
 * At the default system setting (fontScale 1.0) this returns exactly `ms(size)`,
 * so capping never changes the look for the majority of users.
 *
 * Known limitation: `PixelRatio.getFontScale()` is read once at module load.
 * Android restarts the activity when the font size setting changes (fontScale is
 * not in the manifest's configChanges), so it picks the new value up; on iOS a
 * change in Settings only takes effect after an app restart.
 */
export function msFont(size: number, cap: number = FONT_CAP.text, factor: number = 0.5): number {
  const base = ms(size, factor);
  return fontScale <= cap ? base : Math.round((base * cap) / fontScale);
}
