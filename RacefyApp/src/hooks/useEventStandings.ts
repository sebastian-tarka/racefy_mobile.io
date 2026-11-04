import { useMemo } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { EventStandingsResponse } from '../types/api';
import { useForegroundInterval } from './useForegroundInterval';
import {
  type RankedRow,
  normalizeIndividualStanding,
  normalizeTeamStanding,
  sumBy,
} from '../utils/eventStandings';

interface EventStandingsAggregates {
  /** Everyone with an event activity (the rows). */
  trackedCount: number;
  /** On course right now (`is_recording`). */
  racingCount: number;
  finishedCount: number;
  finishedPct: number;
  totalDistance: number;
  totalElevation: number;
  /** The first row, or null while the list is empty. */
  leader: RankedRow | null;
}

interface UseEventStandingsOptions {
  enabled?: boolean;
  /** Auto-refresh interval in ms. 0 disables polling. Default 30000. */
  pollMs?: number;
}

/**
 * Live standings for an event, flattened to `RankedRow`s. Auto-refreshes every 30s
 * while `enabled` (use only for ongoing events). Exposes derived aggregates for the
 * pulse tiles.
 */
export function useEventStandings(eventId: number, options: UseEventStandingsOptions = {}) {
  const { enabled = true, pollMs = 30000 } = options;

  const { data, isLoading, error, refetch } = useFetch<EventStandingsResponse>(
    () => api.getEventStandings(eventId),
    {
      enabled,
      deps: [eventId],
      logCategory: 'api',
      errorMessage: 'Failed to load standings',
    },
  );

  // Polling, foreground only; refreshes at once when the app comes back.
  useForegroundInterval(refetch, enabled && pollMs > 0 ? pollMs : null);

  const rows = useMemo(
    () => (data?.individual_standings ?? []).map(normalizeIndividualStanding),
    [data],
  );
  const teamRows = useMemo(() => (data?.team_standings ?? []).map(normalizeTeamStanding), [data]);

  const aggregates = useMemo<EventStandingsAggregates>(() => {
    const trackedCount = rows.length;
    const finishedCount = rows.filter((r) => r.isFinished).length;
    return {
      trackedCount,
      racingCount: rows.filter((r) => r.isRecording).length,
      finishedCount,
      finishedPct: trackedCount > 0 ? Math.round((finishedCount / trackedCount) * 100) : 0,
      totalDistance: sumBy(rows, 'distance'),
      totalElevation: sumBy(rows, 'elevation'),
      leader: rows[0] ?? null,
    };
  }, [rows]);

  return {
    standings: data ?? null,
    rows,
    teamRows,
    isTeamEvent: data?.is_team_event ?? false,
    rankingMode: data?.ranking_mode,
    aggregates,
    isLoading,
    error,
    refresh: refetch,
  };
}
