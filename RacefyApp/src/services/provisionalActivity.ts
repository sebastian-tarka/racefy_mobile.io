import type { Activity } from '../types/api';

/**
 * A recording the server has not seen yet lives under a negative id — real ids
 * are positive, so every "talk to the server about this activity" path can tell
 * at a glance that there is nobody to talk to yet.
 */
export const isProvisionalActivity = (activity: Pick<Activity, 'id'> | null | undefined) =>
  !!activity && activity.id < 0;
