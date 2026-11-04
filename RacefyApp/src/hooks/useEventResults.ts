import { useMemo } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { EventResultsResponse } from '../types/api';
import { type RankedRow, normalizeDnf, normalizeResult, sumBy } from '../utils/eventStandings';

interface UseEventResultsOptions {
  enabled?: boolean;
}

/**
 * GET /events/{id}/results for a completed event: the finalized rows (empty until the
 * organizer finalizes — the live standings are the provisional ranking until then), the
 * DNF list and the signed-in participant's own outcome (`viewer_result`).
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

  const rows = useMemo(() => (data?.individual_results ?? []).map(normalizeResult), [data]);
  const teamRows = useMemo(() => (data?.team_results ?? []).map(normalizeResult), [data]);
  const dnfRows = useMemo<RankedRow[]>(
    () => (data?.did_not_finish ?? []).map(normalizeDnf),
    [data],
  );

  const aggregates = useMemo(() => {
    return {
      finishers: rows.length,
      totalDistance: sumBy(rows, 'distance'),
      totalElevation: sumBy(rows, 'elevation'),
    };
  }, [rows]);

  return {
    results: data ?? null,
    isFinalized: data?.results_finalized ?? false,
    rows,
    teamRows,
    dnfRows,
    viewerResult: data?.viewer_result ?? null,
    isTeamEvent: data?.is_team_event ?? false,
    rankingMode: data?.ranking_mode,
    aggregates,
    isLoading,
    error,
    refresh: refetch,
  };
}
