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