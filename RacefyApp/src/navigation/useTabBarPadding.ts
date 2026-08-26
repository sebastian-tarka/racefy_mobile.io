import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { TAB_BAR_CONTENT_GAP } from './constants';

/**
 * Bottom padding for scrollable content that sits under the floating tab bar.
 *
 * The tab bar uses `position: 'absolute'` (see `tabBarStyle` in AppNavigator), so
 * React Navigation does NOT shrink the screen's content area for it — every screen
 * has to reserve the space itself.
 *
 * The height comes from React Navigation's own context rather than a hardcoded
 * guess. `BottomTabBarHeightContext` is used directly instead of the
 * `useBottomTabBarHeight()` helper because that helper throws outside a tab
 * navigator, and some callers are shared components with no such guarantee.
 * Outside the tab navigator there is no bar to clear, hence the 0 fallback.
 *
 * @param extra Additional breathing room on top of the standard gap.
 */
export function useTabBarPadding(extra: number = 0): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return tabBarHeight + TAB_BAR_CONTENT_GAP + extra;
}
