import { useCallback, useState } from 'react';
import { api } from '../services/api';
import type { Team } from '../types/api';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchTeams = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset) setIsLoading(true);
    try {
      const response = await api.getTeams({
        search: search || undefined,
        page: currentPage,
        per_page: 20,
      });
      const newTeams = response.data;
      setTeams(reset ? newTeams : prev => [...prev, ...newTeams]);
      setHasMore(response.meta.current_page < response.meta.last_page);
      setPage(currentPage + 1);
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchTeams(true);
  }, [fetchTeams]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTeams(false);
    }
  }, [isLoading, hasMore, fetchTeams]);

  return {
    teams, isLoading, isRefreshing, hasMore,
    search, setSearch,
    fetchTeams, refresh, loadMore,
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
