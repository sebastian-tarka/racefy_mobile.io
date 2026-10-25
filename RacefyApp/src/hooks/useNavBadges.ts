import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  clearNavBadges,
  getNavBadges,
  markNavSectionSeen,
  refreshNavBadges,
  subscribeNavBadges,
} from '../services/navBadges';
import type { BadgeSection, BadgesResponse } from '../types/api';

/** Refresh cadence while the app is in front — the counts are a nudge, not a feed. */
const REFRESH_INTERVAL_MS = 120_000;

/** The current badges, or null before the first load / when signed out. */
export function useNavBadges(): BadgesResponse | null {
  return useSyncExternalStore(subscribeNavBadges, getNavBadges);
}

/** "New" count of one section (0 while unknown). */
export function useNavSectionCount(section: BadgeSection): number {
  return useNavBadges()?.sections[section] ?? 0;
}

/**
 * Owns when the badges are refreshed: sign-in, back to the foreground, and a
 * slow interval while the app is in front. Mounted once, with the tab bar.
 */
export function useNavBadgesRunner(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) {
      clearNavBadges();
      return;
    }
    void refreshNavBadges();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshNavBadges();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshNavBadges();
    }, REFRESH_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [isAuthenticated]);
}

/**
 * Clear a section's "new" count while its screen is focused. Pass `active:
 * false` for a section that is only one tab of a screen until that tab shows.
 */
export function useMarkSectionSeen(section: BadgeSection, active = true) {
  const count = useNavSectionCount(section);
  useFocusEffect(
    useCallback(() => {
      if (active && count > 0) markNavSectionSeen(section);
    }, [active, count, section]),
  );
}
