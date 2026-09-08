import type { TimeRange } from '../components/TimeRangeFilter';
import { logger } from '../services/logger';

export interface DateRange {
  from: string;
  to: string;
}

/**
 * Calculate date range based on time range selection
 * Returns dates in YYYY-MM-DD format
 */
export function getDateRangeForTimeRange(timeRange: TimeRange): DateRange | null {
  const today = new Date();
  const to = today.toISOString().split('T')[0];

  let result: DateRange | null = null;

  switch (timeRange) {
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      result = {
        from: weekAgo.toISOString().split('T')[0],
        to,
      };
      break;
    }

    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      result = {
        from: monthAgo.toISOString().split('T')[0],
        to,
      };
      break;
    }

    case 'year': {
      const yearAgo = new Date(today);
      yearAgo.setFullYear(today.getFullYear() - 1);
      result = {
        from: yearAgo.toISOString().split('T')[0],
        to,
      };
      break;
    }

    case 'all_time':
      // Return null to indicate no date filter (all time)
      result = null;
      break;

    default:
      result = null;
      break;
  }

  logger.debug('profile', 'getDateRangeForTimeRange called', { timeRange, result });
  return result;
}

/**
 * The window of the same length immediately before `range` — what "vs last
 * month" compares against (design "Racefy v2" → StatsTab headline delta).
 *
 * Null for all-time: there is nothing before everything.
 */
export function getPreviousDateRange(range: DateRange | null): DateRange | null {
  if (!range) return null;
  const from = new Date(range.from);
  const to = new Date(range.to);
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days);
  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0],
  };
}
