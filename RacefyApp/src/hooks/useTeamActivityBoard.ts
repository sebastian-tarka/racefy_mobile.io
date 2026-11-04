import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useFetch } from './useFetch';
import { usePaginatedFetch } from './usePaginatedFetch';
import type {
  SportType,
  TeamActivityTotals,
  TeamBoardActivity,
  TeamMemberRank,
} from '../types/api';

const TEAM_BOARD_PAGE_SIZE = 15;

interface UseTeamActivityBoardOptions {
  /** Fetch nothing while false (the tab is not open). Default true. */
  enabled?: boolean;
}

export interface TeamActivityBoardState {
  /** This week's team totals (`/stats?period=this_week`), null until loaded or when private. */
  week: TeamActivityTotals | null;
  /** Most active member this week by distance; null when nobody has distance yet. */
  leader: TeamMemberRank | null;
  activities: TeamBoardActivity[];
  /** Sports seen on the first unfiltered page — chips are shown when there are 2+. */
  sports: SportType[];
  sportTypeId: number | null;
  setSportTypeId: (id: number | null) => void;
  /** 403 from the board: private team and the viewer is not a member. */
  isPrivate: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

/**
 * Data for the team "Activities" tab (`docs/api/mobile/API_ENDPOINTS.md`, "Team
 * activity board"): this week in numbers, the most active member and the
 * members' finished activities the viewer may see. Membership unlocks nothing —
 * the server already applied each activity's visibility, so rows are shown as they come.
 */
export function useTeamActivityBoard(
  slug: string,
  { enabled = true }: UseTeamActivityBoardOptions = {},
): TeamActivityBoardState {
  const [sportTypeId, setSportTypeId] = useState<number | null>(null);
  const [sports, setSports] = useState<SportType[]>([]);

  const list = usePaginatedFetch<TeamBoardActivity>(
    (page) =>
      api
        .getTeamActivities(slug, {
          page,
          per_page: TEAM_BOARD_PAGE_SIZE,
          sport_type_id: sportTypeId ?? undefined,
        })
        .catch((err: unknown) => {
          // A private team is a state of the tab, not a failure — surface it as a sentinel.
          if ((err as { status?: number })?.status === 403) throw new Error('private');
          throw err;
        }),
    {
      enabled: enabled && !!slug,
      deps: [slug, sportTypeId],
      dedupeBy: (activity) => activity.id,
      logCategory: 'general',
      errorMessage: 'Failed to load team activities',
    },
  );

  const isPrivate = list.error === 'private';

  // Sport chips come from the first unfiltered page only, so the row of chips does
  // not shuffle while the user scrolls or filters.
  const { data: activities, page } = list;
  useEffect(() => {
    if (sportTypeId !== null || page !== 1 || activities.length === 0) return;
    const seen = new Map<number, SportType>();
    activities.slice(0, TEAM_BOARD_PAGE_SIZE).forEach((activity) => {
      if (activity.sport_type) seen.set(activity.sport_type.id, activity.sport_type);
    });
    setSports(Array.from(seen.values()));
  }, [activities, page, sportTypeId]);

  const weekEnabled = enabled && !!slug && !isPrivate;
  const {
    data: weekStats,
    refetch: refetchWeek,
    isLoading: weekLoading,
  } = useFetch(() => api.getTeamStats(slug, 'this_week'), {
    enabled: weekEnabled,
    deps: [slug],
    logCategory: 'general',
    errorMessage: 'Failed to load team week stats',
  });
  const { data: ranking, refetch: refetchRanking } = useFetch(
    () => api.getTeamRanking(slug, { period: 'this_week', sort_by: 'distance' }),
    {
      enabled: weekEnabled,
      deps: [slug],
      logCategory: 'general',
      errorMessage: 'Failed to load team week ranking',
    },
  );

  const leader = useMemo(() => {
    const first = ranking?.ranking[0];
    return first && first.total_distance > 0 ? first : null;
  }, [ranking]);

  const { refresh: refreshList } = list;
  const refresh = useCallback(async () => {
    await Promise.all([refreshList(), refetchWeek(), refetchRanking()]);
  }, [refreshList, refetchWeek, refetchRanking]);

  return {
    week: weekStats?.period ?? null,
    leader,
    activities,
    sports,
    sportTypeId,
    setSportTypeId,
    isPrivate,
    isLoading: list.isLoading || (weekLoading && activities.length === 0 && !list.error),
    isRefreshing: list.isRefreshing,
    isLoadingMore: list.isLoadingMore,
    hasMore: list.hasMore,
    error: isPrivate ? null : list.error,
    loadMore: list.loadMore,
    refresh,
  };
}
