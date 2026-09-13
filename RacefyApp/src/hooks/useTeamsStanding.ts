import { useMemo } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { TeamLeaderboardEntry, TeamLeaderboardResponse } from '../types/api';

interface UseTeamsStandingResult {
  /** Standing per team id, so a list row can show its own numbers. */
  byTeamId: Map<number, TeamLeaderboardEntry>;
  /** How many teams are ranked in the period — the "of N" in "#3 of 57". */
  total: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Where each team sits this month.
 *
 * The teams leaderboard is ranked by training volume — distance, duration,
 * elevation, activities or members — not by points; there is no team points
 * total anywhere in the API. So the list says how much a team actually trains,
 * which is the honest version of "how is my team doing".
 */
export function useTeamsStanding(limit = 100): UseTeamsStandingResult {
  const { data, isLoading, refetch } = useFetch<TeamLeaderboardResponse>(
    () => api.getTeamsLeaderboard({ sort_by: 'distance', period: 'this_month', limit }),
    { errorMessage: 'Failed to load team standings', deps: [limit] },
  );

  const byTeamId = useMemo(() => {
    const map = new Map<number, TeamLeaderboardEntry>();
    for (const entry of data?.data ?? []) map.set(entry.team_id, entry);
    return map;
  }, [data]);

  return { byTeamId, total: data?.total ?? 0, isLoading, refetch };
}
