import { api } from './api';
import { logger } from './logger';
import type { BadgeReward } from '../types/api';
import { getErrorMessage } from '../utils/errors';

/**
 * Badges the athlete opened in this session (reward ids, `badge_123`).
 *
 * The server owns "new" (`is_new` on the UserBadge), but Profile, Home and
 * Rewards each hold their own copy of /user/rewards. Without this overlay the
 * dot would linger on the other screens until each one refetched. Ids are
 * unique across users, so the set needs no clearing on sign-out.
 */
let seen: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

export function subscribeSeenBadges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSeenBadges(): ReadonlySet<string> {
  return seen;
}

/**
 * The badge was opened. Only a new one is reported, and only once — the dot
 * goes at once; a failed call just leaves the server to say "new" again on the
 * next load.
 */
export function markBadgeSeen(reward: BadgeReward): void {
  if (!reward.is_new || seen.has(reward.id)) return;
  seen = new Set(seen).add(reward.id);
  listeners.forEach((l) => l());
  api
    .markBadgeViewed(reward.id)
    .catch((error) =>
      logger.debug('api', 'Badge viewed failed', { id: reward.id, error: getErrorMessage(error) }),
    );
}
