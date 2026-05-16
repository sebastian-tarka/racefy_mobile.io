import type { HomeCtaAction, HomeActionPayload } from '../types/api';
import { api } from '../services/api';
import { logger } from '../services/logger';

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
export function mapCtaActionToNavigation(
  action: HomeCtaAction | string,
  payload?: HomeActionPayload
): NavigationTarget | null {
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

    case 'start_planned_training':
    case 'view_training_week': {
      const weekId = payload?.training_week_id;
      if (!weekId) {
        // Fallback to Record tab when we have no week to open.
        return { tab: 'Record' };
      }
      return {
        root: 'TrainingWeekDetail',
        params: { weekId },
      };
    }

    case 'view_goal': {
      const goalId = payload?.goal_id;
      if (!goalId) return null;
      return {
        root: 'GoalDetail',
        params: { goalId },
      };
    }

    case 'resume_training':
      // resume_training is side-effectful (PATCH); navigation only
      // happens after the API call completes - see executeCtaAction.
      return null;

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
 * @param payload - Optional payload (training_week_id, goal_id, …)
 * @returns true if navigation was executed, false if action was unknown
 */
export function navigateForCtaAction(
  navigation: any,
  action: HomeCtaAction | string,
  payload?: HomeActionPayload
): boolean {
  const target = mapCtaActionToNavigation(action, payload);

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
  action: HomeCtaAction | string,
  payload?: HomeActionPayload
): boolean {
  const target = mapCtaActionToNavigation(action, payload);

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

/**
 * Execute a CTA action that may have side effects (e.g. `resume_training`
 * requires PATCHing the program before navigating). For pure-navigation
 * actions this is equivalent to navigateForCtaActionFromTab.
 */
export async function executeCtaActionFromTab(
  navigation: any,
  action: HomeCtaAction | string,
  payload?: HomeActionPayload
): Promise<boolean> {
  if (action === 'resume_training') {
    const programId = payload?.program_id;
    if (!programId) {
      logger.warn('navigation', 'resume_training missing program_id');
      return false;
    }
    try {
      await api.resumeProgram(programId);
    } catch (err) {
      logger.error('navigation', 'Failed to resume program', { error: err, programId });
      return false;
    }
    // After resuming, refresh home — caller can decide to refetch.
    return true;
  }

  return navigateForCtaActionFromTab(navigation, action, payload);
}