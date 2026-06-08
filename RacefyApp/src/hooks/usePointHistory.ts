import { api } from '../services/api';
import { usePaginatedFetch } from './usePaginatedFetch';
import type { PointTransaction, PointTransactionType } from '../types/api';

interface UsePointHistoryOptions {
  type?: PointTransactionType;
  limit?: number;
  autoLoad?: boolean;
}

interface UsePointHistoryResult {
  transactions: PointTransaction[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => void;
}

export function usePointHistory({
  type,
  limit = 20,
  autoLoad = true,
}: UsePointHistoryOptions = {}): UsePointHistoryResult {
  const { data, isLoading, isLoadingMore, error, hasMore, refresh, loadMore } =
    usePaginatedFetch<PointTransaction>(
      // Adapt the {transactions, pagination} envelope to the hook's minimal shape.
      (page) =>
        api.getPointHistory(page, limit, type).then((res) => ({
          data: res.transactions,
          meta: {
            current_page: res.pagination.current_page,
            last_page: res.pagination.last_page,
          },
        })),
      {
        enabled: autoLoad,
        deps: [type, limit],
        errorMessage: 'Failed to load point history',
      },
    );

  return {
    transactions: data,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    refetch: refresh,
    loadMore,
  };
}
