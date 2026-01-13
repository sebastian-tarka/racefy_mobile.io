import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';
import type { MilestonesData } from '../types/api';

interface UseMilestonesResult {
  milestones: MilestonesData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMilestones(sportTypeId?: number): UseMilestonesResult {
  const { isAuthenticated } = useAuth();
  const [milestones, setMilestones] = useState<MilestonesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    if (!isAuthenticated) {
      setMilestones(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getMilestones(sportTypeId);
      setMilestones(data);
    } catch (err: any) {
      logger.error('activity', 'Failed to fetch milestones', { error: err });
      setError(err.message || 'Failed to load milestones');
      setMilestones(null);
    } finally {
      setIsLoading(false);
    }
  }, [sportTypeId, isAuthenticated]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const refetch = useCallback(async () => {
    await fetchMilestones();
  }, [fetchMilestones]);

  return {
    milestones,
    isLoading,
    error,
    refetch,
  };
}