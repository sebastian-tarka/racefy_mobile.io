import { useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useFetch } from './useFetch';
import type { ActivityTrendsResponse, TrendGranularity } from '../types/api';
import type { TimeRange } from '../components/TimeRangeFilter';

/**
 * How many buckets, and how wide, for each period the stats tab offers.
 *
 * The API buckets by week or by month only, so "week" borrows the weekly
 * granularity and simply shows fewer of them — a day-by-day trend is not
 * something the endpoint can answer, and inventing one from activity rows would
 * disagree with every other number on the tab.
 */
const SHAPE: Record<TimeRange, { granularity: TrendGranularity; periods: number }> = {
  week: { granularity: 'weekly', periods: 8 },
  month: { granularity: 'weekly', periods: 12 },
  year: { granularity: 'monthly', periods: 12 },
  all_time: { granularity: 'monthly', periods: 24 },
};

interface UseActivityTrends {
  trends: ActivityTrendsResponse['trends'];
  granularity: TrendGranularity;
  isLoading: boolean;
}

export function useActivityTrends(
  timeRange: TimeRange,
  sportTypeId: number | null,
): UseActivityTrends {
  const { isAuthenticated } = useAuth();
  const shape = SHAPE[timeRange] ?? SHAPE.all_time;

  const { data, isLoading } = useFetch<ActivityTrendsResponse>(
    () =>
      api.getActivityTrends({
        granularity: shape.granularity,
        periods: shape.periods,
        sport_type_id: sportTypeId ?? undefined,
      }),
    {
      enabled: isAuthenticated,
      deps: [isAuthenticated, shape.granularity, shape.periods, sportTypeId],
      logCategory: 'api',
      errorMessage: 'Failed to fetch activity trends',
    },
  );

  return useMemo(
    () => ({
      trends: data?.trends ?? [],
      granularity: data?.granularity ?? shape.granularity,
      isLoading,
    }),
    [data, isLoading, shape.granularity],
  );
}
