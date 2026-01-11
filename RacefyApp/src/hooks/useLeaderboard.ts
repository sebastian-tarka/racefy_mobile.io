import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardResponse,
  EventLeaderboardResponse,
} from '../types/api';

export type LeaderboardType = 'global' | 'following';

interface UseLeaderboardOptions {
  type: LeaderboardType;
  period?: LeaderboardPeriod;
  limit?: number;
  autoLoad?: boolean;
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  period: LeaderboardPeriod;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  changePeriod: (period: LeaderboardPeriod) => void;
}

export function useLeaderboard({
  type,
  period: initialPeriod = 'all_time',
  limit = 50,
  autoLoad = true,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response: LeaderboardResponse;

      if (type === 'global') {
        response = await api.getGlobalLeaderboard(period, limit);
      } else {
        response = await api.getFollowingLeaderboard(period, limit);
      }

      setEntries(response.leaderboard);
    } catch (err: any) {
      logger.error('api', `Failed to fetch ${type} leaderboard`, { error: err, period });
      setError(err.message || 'Failed to load leaderboard');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, period, limit]);

  useEffect(() => {
    if (autoLoad) {
      fetchLeaderboard();
    }
  }, [fetchLeaderboard, autoLoad]);

  const changePeriod = useCallback((newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod);
  }, []);

  return {
    entries,
    period,
    isLoading,
    error,
    refetch: fetchLeaderboard,
    changePeriod,
  };
}

// Hook for event-specific leaderboard
interface UseEventLeaderboardOptions {
  eventId: number;
  limit?: number;
  autoLoad?: boolean;
}

interface UseEventLeaderboardResult {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEventLeaderboard({
  eventId,
  limit = 50,
  autoLoad = true,
}: UseEventLeaderboardOptions): UseEventLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response: EventLeaderboardResponse = await api.getEventLeaderboard(eventId, limit);
      setEntries(response.leaderboard);
    } catch (err: any) {
      logger.error('api', 'Failed to fetch event leaderboard', { error: err, eventId });
      setError(err.message || 'Failed to load leaderboard');
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, limit]);

  useEffect(() => {
    if (autoLoad && eventId) {
      fetchLeaderboard();
    }
  }, [fetchLeaderboard, autoLoad, eventId]);

  return {
    entries,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
}