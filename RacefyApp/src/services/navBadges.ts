import { api } from './api';
import { logger } from './logger';
import type { BadgeSection, BadgesResponse } from '../types/api';
import { getErrorMessage } from '../utils/errors';

/**
 * Navigation badges (GET /me/badges) shared by the tab bar, the profile tool
 * list and the screens that clear them. One copy for the whole app, read
 * through useNavBadges(); useNavBadgesRunner() decides when it is refreshed.
 *
 * "New since last visit" lives on the server, so opening Events on the web
 * clears the dot here and the other way round.
 */
let state: BadgesResponse | null = null;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function set(next: BadgesResponse | null) {
  state = next;
  listeners.forEach((l) => l());
}

export function subscribeNavBadges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNavBadges(): BadgesResponse | null {
  return state;
}

export function refreshNavBadges(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = api
    .getBadges()
    .then(set)
    .catch((error) =>
      logger.debug('api', 'Badges refresh failed', { error: getErrorMessage(error) }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * The user opened a section. Only a section with something new is reported —
 * an empty one has nothing to clear, and the endpoint is throttled. The count
 * drops at once; the server's answer replaces the whole payload.
 */
export function markNavSectionSeen(section: BadgeSection): void {
  if (!state || state.sections[section] <= 0) return;
  set({ ...state, sections: { ...state.sections, [section]: 0 } });
  api
    .markBadgeSectionSeen(section)
    .then(set)
    .catch((error) =>
      logger.debug('api', 'Badge section seen failed', { section, error: getErrorMessage(error) }),
    );
}

/** Signed out: nothing to show. */
export function clearNavBadges(): void {
  set(null);
}
