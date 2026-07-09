import { useMemo } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { EventResult, EventResultsResponse } from '../types/api';

interface UseEventResultsOptions {
  enabled?: boolean;
}

/**
 * Finalized results for a completed event. Exposes the top-3 podium and derived
 * finisher aggregates for the results summary cards.
 */
export function useEventResults(eventId: number, options: UseEventResultsOptions = {}) {
  const { enabled = true } = options;

  const { data, isLoading, error, refetch } = useFetch<EventResultsResponse>(
    () => api.getEventResults(eventId),
    {
      enabled,
      deps: [eventId],
      logCategory: 'api',
      errorMessage: 'Failed to load results',
    },
  );

  const individual = useMemo(() => data?.individual_results ?? [], [data]);

  const aggregates = useMemo(() => {
    const finishers = individual.length;
    const totalDistance = individual.reduce((sum, r) => sum + (r.distance ?? 0), 0);
    const totalElevation = individual.reduce((sum, r) => sum + (r.elevation_gain ?? 0), 0);
    const podium: EventResult[] = individual
      .filter((r) => r.place >= 1 && r.place <= 3)
      .sort((a, b) => a.place - b.place);
    return { finishers, totalDistance, totalElevation, podium };
  }, [individual]);

  return {
    results: data ?? null,
    isFinalized: data?.results_finalized ?? false,
    individualResults: individual,
    teamResults: data?.team_results ?? [],
    rankingMode: data?.ranking_mode,
    aggregates,
    isLoading,
    error,
    refresh: refetch,
  };
}
