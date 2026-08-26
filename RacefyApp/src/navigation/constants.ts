/**
 * Navigation constants
 * Extracted to avoid circular dependencies between AppNavigator and screens
 */
import { spacing } from '../theme/spacing';

/**
 * Breathing room between the last item of a scrollable list and the tab bar.
 *
 * This is the ONLY hardcoded part of the tab bar padding — the bar's own height is
 * read from React Navigation at runtime via `useTabBarPadding()`. Do not
 * reintroduce a hardcoded bar height here: the previous `TAB_BAR_HEIGHT = ms(58)`
 * and the `60` magic number scattered across screens were both guesses, and both
 * overshot (React Navigation uses 49 + bottom inset in portrait).
 */
export const TAB_BAR_CONTENT_GAP = spacing.xxl;
