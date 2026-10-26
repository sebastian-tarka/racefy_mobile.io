import type { Activity, ActivityLocation } from '../types/api';
import { totalPausedAt, type LedgerState } from './activityLifecycleLedger';
import type { UnsyncedActivityMeta } from './unsyncedActivities';

/** What the last finish attempt asked for (see useLiveActivity → lastFinishAttemptRef). */
export interface FinishAttempt {
  endedAt: string;
  data?: {
    title?: string;
    description?: string;
    calories?: number;
    skip_auto_post?: boolean;
    event_id?: number | null;
  };
}

export interface UnsyncedSnapshotInput {
  activity: Activity;
  attempt: FinishAttempt | null;
  ledger: LedgerState | null;
  clientActivityId: string | null;
  /** Timestamp (ms) of the last GPS fix, if any. */
  lastFixAt: number | null | undefined;
  stats: {
    distance: number;
    duration: number;
    elevation_gain?: number;
    calories: number;
    avg_heart_rate?: number;
    max_heart_rate?: number;
  };
  location: ActivityLocation | null;
  pointsCount: number;
  errorMessage: string;
  now?: () => Date;
}

export type UnsyncedSnapshot = Omit<UnsyncedActivityMeta, 'failedAt' | 'retryCount'>;

/**
 * The unsynced-queue entry for a recording whose finish the server keeps
 * refusing — everything a later retry (or a GPX export) needs.
 *
 * The end is the one the athlete asked for; the last GPS fix, then "now", only
 * as fallbacks. The athlete's choices on the finish screen ride along — without
 * them a retried finish saved the activity untitled, unlinked from its event,
 * and shared even when "save privately" was picked. The device's pause total
 * goes only when a pause/resume never reached the server (a dirty ledger).
 */
export function buildUnsyncedSnapshot(input: UnsyncedSnapshotInput): UnsyncedSnapshot {
  const { activity, attempt, ledger, stats } = input;
  const now = input.now ?? (() => new Date());
  const endedAt =
    attempt?.endedAt ??
    (input.lastFixAt ? new Date(input.lastFixAt).toISOString() : now().toISOString());

  return {
    activityId: activity.id,
    sportTypeId: activity.sport_type_id,
    sportTypeName: activity.sport_type?.name,
    title: attempt?.data?.title ?? activity.title,
    description: attempt?.data?.description,
    skipAutoPost: attempt?.data?.skip_auto_post,
    eventId: attempt?.data?.event_id,
    clientActivityId: input.clientActivityId ?? undefined,
    totalPausedDuration: ledger?.dirty ? totalPausedAt(ledger, endedAt) : undefined,
    startedAt: activity.started_at,
    endedAt,
    distance: Math.round(stats.distance),
    duration: stats.duration,
    elevationGain: Math.round(stats.elevation_gain || 0),
    calories: attempt?.data?.calories ?? stats.calories,
    avgHeartRate: stats.avg_heart_rate,
    maxHeartRate: stats.max_heart_rate,
    pointsCount: input.pointsCount,
    location: input.location ?? undefined,
    lastError: input.errorMessage,
  };
}
