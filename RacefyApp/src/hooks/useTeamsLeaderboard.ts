import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type {
  TeamLeaderboardResponse,
  TeamLeaderboardEntry,
  LeaderboardSortBy,
  StatsPeriod,
} from '../types/api';
import { getErrorMessage } from '../utils/errors';

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
  /** Only the latest request may write — quick filter switches used to mix rankings. */
  const fetchSeq = useRef(0);

  const fetchLeaderboard = useCallback(
    async (reset = true) => {
      const seq = ++fetchSeq.current;
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
        if (seq !== fetchSeq.current) return;
        if (reset) {
          setEntries(data.data);
        } else {
          setEntries((prev) => [...prev, ...data.data]);
        }
        setTotal(data.total);
        setOffset(currentOffset + data.data.length);
      } catch (err) {
        if (seq !== fetchSeq.current) return;
        logger.error('general', 'Failed to fetch teams leaderboard', { error: err });
        setError(getErrorMessage(err) || 'Failed to load leaderboard');
        // A failed first page must not leave the previous filter's ranking on screen.
        if (reset) {
          setEntries([]);
          setTotal(0);
        }
      } finally {
        if (seq === fetchSeq.current) setIsLoading(false);
      }
    },
    [sortBy, period, offset],
  );

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
