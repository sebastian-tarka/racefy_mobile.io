import { useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { EventStandingEntry, EventStandingsResponse } from '../types/api';

/** Read a metric uniformly across single-activity and aggregated standings rows. */
export function normalizeStanding(entry: EventStandingEntry): {
  distance: number;
  duration: number;
  elevationGain: number;
  isFinished: boolean;
} {
  return {
    distance: entry.total_distance ?? entry.activity?.distance ?? 0,
    duration: entry.total_duration ?? entry.activity?.duration ?? 0,
    elevationGain: entry.total_elevation_gain ?? entry.activity?.elevation_gain ?? 0,
    isFinished: entry.is_finished,
  };
}

export interface EventStandingsAggregates {
  racingCount: number;
  finishedCount: number;
  finishedPct: number;
  totalDistance: number;
  totalElevation: number;
}

interface UseEventStandingsOptions {
  enabled?: boolean;
  /** Auto-refresh interval in ms. 0 disables polling. Default 30000. */
  pollMs?: number;
}

/**
 * Live standings for an event. Auto-refreshes every 30s while `enabled` (use only
 * for ongoing events). Exposes derived aggregates for the summary cards.
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

  // Polling — kept in a ref so the interval callback stays stable.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    if (!enabled || pollMs <= 0) return;
    const id = setInterval(() => refetchRef.current(), pollMs);
    return () => clearInterval(id);
  }, [enabled, pollMs, eventId]);

  const individual = useMemo(() => data?.individual_standings ?? [], [data]);

  const aggregates = useMemo<EventStandingsAggregates>(() => {
    const racingCount = individual.length;
    const finishedCount = individual.filter((s) => s.is_finished).length;
    const totals = individual.reduce(
      (acc, entry) => {
        const n = normalizeStanding(entry);
        acc.distance += n.distance;
        acc.elevation += n.elevationGain;
        return acc;
      },
      { distance: 0, elevation: 0 },
    );
    return {
      racingCount,
      finishedCount,
      finishedPct: racingCount > 0 ? Math.round((finishedCount / racingCount) * 100) : 0,
      totalDistance: totals.distance,
      totalElevation: totals.elevation,
    };
  }, [individual]);

  return {
    standings: data ?? null,
    individualStandings: individual,
    teamStandings: data?.team_standings ?? [],
    rankingMode: data?.ranking_mode,
    aggregates,
    isLoading,
    error,
    refresh: refetch,
  };
}
