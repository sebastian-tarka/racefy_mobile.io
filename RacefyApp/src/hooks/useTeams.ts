import { useCallback, useRef, useState } from 'react';
import { usePaginatedFetch } from './usePaginatedFetch';
import { api } from '../services/api';
import type { Team } from '../types/api';

export function useTeams() {
  const [search, setSearch] = useState('');
  const searchRef = useRef(search);
  searchRef.current = search;

  // Driven by the screen (debounced search, focus refresh). Race-safe: a new search
  // supersedes the one in flight, so a slow answer for "a" cannot replace "ab".
  const {
    data: teams,
    isRefreshing,
    isLoadingMore,
    hasMore,
    refresh,
    loadMore,
  } = usePaginatedFetch<Team>(
    (page) => api.getTeams({ search: searchRef.current || undefined, page, per_page: 20 }),
    { autoLoad: false, dedupeBy: (t) => t.id, errorMessage: 'Failed to load teams' },
  );

  /** `true` starts over from page 1 (search changed / refresh), `false` loads the next page. */
  const fetchTeams = useCallback(
    async (reset = false) => {
      if (reset) await refresh();
      else loadMore();
    },
    [refresh, loadMore],
  );

  return {
    teams,
    isLoading: isLoadingMore,
    isRefreshing,
    hasMore,
    search,
    setSearch,
    fetchTeams,
    refresh,
    loadMore,
  };
}

export function useMyTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMyTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyTeams();
      setTeams(data);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMyTeams();
  }, [fetchMyTeams]);

  return { teams, isLoading, isRefreshing, fetchMyTeams, refresh };
}
