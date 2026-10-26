import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import { useActivityStats } from '../../../hooks/useActivityStats';
import type { StatsMetric } from '../../../components';
import type { ActivityStats, User } from '../../../types/api';
import {
  getDateRangeForTimeRange,
  getPreviousDateRange,
  type TimeRange,
} from '../../../utils/dateRanges';

/**
 * The profile's statistics filters — period, sport, metric — and everything
 * computed from them: this period's stats, the same window one period back
 * (for the up/down headline), and another athlete's stats to compare with.
 * The sport also filters the Activities tab, so the screen reads it from here.
 */
export function useProfileStatsFilters() {
  const [selectedSportTypeId, setSelectedSportTypeId] = useState<number | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all_time');
  const [statsMetric, setStatsMetric] = useState<StatsMetric>('distance');
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [compareStats, setCompareStats] = useState<ActivityStats | null>(null);
  const [isLoadingCompareStats, setIsLoadingCompareStats] = useState(false);

  // Calculate date range based on selected time range (memoized to prevent unnecessary re-renders)
  const dateRange = useMemo(() => {
    const result = getDateRangeForTimeRange(selectedTimeRange);
    logger.debug('profile', 'Date range calculated', {
      selectedTimeRange,
      result,
    });
    return result;
  }, [selectedTimeRange]);

  const {
    stats: activityStats,
    isLoading: isLoadingActivityStats,
    refetch: refetchActivityStats,
  } = useActivityStats({
    sportTypeId: selectedSportTypeId,
    from: dateRange?.from ?? undefined,
    to: dateRange?.to ?? undefined,
  });
  // The same window one period back, so the headline can say whether this
  // period is up or down. All-time has nothing before it — the hook is idle.
  const previousRange = useMemo(() => getPreviousDateRange(dateRange), [dateRange]);
  const { stats: previousStats } = useActivityStats({
    sportTypeId: selectedSportTypeId,
    from: previousRange?.from ?? undefined,
    to: previousRange?.to ?? undefined,
  });

  useEffect(() => {
    logger.info('profile', 'Filters changed', {
      selectedSportTypeId,
      selectedTimeRange,
      dateRangeFrom: dateRange?.from,
      dateRangeTo: dateRange?.to,
    });
  }, [selectedSportTypeId, selectedTimeRange, dateRange]);

  // Fetch comparison user stats when selected or filters change
  useEffect(() => {
    const fetchCompareStats = async () => {
      if (!compareUser) {
        setCompareStats(null);
        return;
      }

      setIsLoadingCompareStats(true);
      try {
        const stats = await api.getUserActiveActivityStats(compareUser.id, {
          from: dateRange?.from ?? undefined,
          to: dateRange?.to ?? undefined,
          sport_type_id: selectedSportTypeId || undefined,
        });
        setCompareStats(stats);
      } catch (error) {
        logger.error('api', 'Failed to fetch compare user stats', {
          error,
          userId: compareUser.id,
        });
        setCompareStats(null);
      } finally {
        setIsLoadingCompareStats(false);
      }
    };

    fetchCompareStats();
  }, [compareUser, selectedSportTypeId, dateRange]);

  return {
    selectedSportTypeId,
    setSelectedSportTypeId,
    selectedTimeRange,
    setSelectedTimeRange,
    statsMetric,
    setStatsMetric,
    previousRange,
    activityStats,
    isLoadingActivityStats,
    refetchActivityStats,
    previousStats,
    compareUser,
    setCompareUser,
    compareStats,
    isLoadingCompareStats,
  };
}

export type ProfileStatsFilters = ReturnType<typeof useProfileStatsFilters>;
