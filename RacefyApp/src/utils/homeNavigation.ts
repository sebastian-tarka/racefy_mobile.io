import type { HomeCtaAction } from '../types/api';

/**
 * Maps CTA action strings from the backend to navigation routes.
 *
 * This is the ONLY place where CTA actions are interpreted.
 * Mobile does NOT add any business logic - just maps actions to routes.
 */

interface NavigationTarget {
  /** Navigate to root stack screen */
  root?: string;
  /** Navigate to main tab */
  tab?: string;
  /** Screen params */
  params?: Record<string, unknown>;
}

/**
 * Map CTA action to navigation target.
 * Returns null for unknown actions (safe fallback).
 */
export function mapCtaActionToNavigation(action: HomeCtaAction): NavigationTarget | null {
  switch (action) {
    case 'start_activity':
      return { tab: 'Record' };

    case 'view_events':
      return { tab: 'Events' };

    case 'view_feed':
      return { tab: 'Feed' };

    case 'register':
      return {
        root: 'Auth',
        params: { screen: 'Register' },
      };

    default:
      // Unknown action - return null for safe handling
      return null;
  }
}

/**
 * Execute navigation for a CTA action.
 *
 * @param navigation - React Navigation prop (any to avoid complex typing)
 * @param action - CTA action from backend
 * @returns true if navigation was executed, false if action was unknown
 */
export function navigateForCtaAction(
  navigation: any,
  action: HomeCtaAction
): boolean {
  const target = mapCtaActionToNavigation(action);

  if (!target) {
    // Unknown action - do nothing
    return false;
  }

  if (target.root) {
    // Navigate to root stack screen
    navigation.navigate(target.root, target.params);
    return true;
  }

  if (target.tab) {
    // Navigate to main tab - need to go through Main
    navigation.navigate('Main', {
      screen: target.tab,
      params: target.params,
    });
    return true;
  }

  return false;
}

/**
 * Execute navigation from within a tab navigator.
 * Use this when already inside the Main tabs.
 */
export function navigateForCtaActionFromTab(
  navigation: any,
  action: HomeCtaAction
): boolean {
  const target = mapCtaActionToNavigation(action);

  if (!target) {
    return false;
  }

  if (target.root) {
    // Navigate to root stack screen
    navigation.getParent()?.navigate(target.root, target.params);
    return true;
  }

  if (target.tab) {
    // Navigate to sibling tab
    navigation.navigate(target.tab, target.params);
    return true;
  }

  return false;
}
