import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { TeamLeaderboardResponse, TeamLeaderboardEntry, LeaderboardSortBy, StatsPeriod } from '../types/api';

interface UseTeamsLeaderboardResult {
  entries: TeamLeaderboardEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
}

const PAGE_SIZE = 20;

export function useTeamsLeaderboard(
  sortBy: LeaderboardSortBy = 'distance',
  period?: StatsPeriod,
): UseTeamsLeaderboardResult {
  const [entries, setEntries] = useState<TeamLeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchLeaderboard = useCallback(async (reset = true) => {
    const currentOffset = reset ? 0 : offset;
    setIsLoading(true);
    setError(null);

    try {
      const data: TeamLeaderboardResponse = await api.getTeamsLeaderboard({
        sort_by: sortBy,
        period,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      if (reset) {
        setEntries(data.data);
      } else {
        setEntries(prev => [...prev, ...data.data]);
      }
      setTotal(data.total);
      setOffset(currentOffset + data.data.length);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch teams leaderboard', { error: err });
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, period, offset]);

  useEffect(() => {
    setOffset(0);
    fetchLeaderboard(true);
  }, [sortBy, period]);

  const loadMore = useCallback(() => {
    if (!isLoading && entries.length < total) {
      fetchLeaderboard(false);
    }
  }, [isLoading, entries.length, total, fetchLeaderboard]);

  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchLeaderboard(true);
  }, [fetchLeaderboard]);

  return {
    entries,
    total,
    isLoading,
    error,
    hasMore: entries.length < total,
    loadMore,
    refetch,
  };
}