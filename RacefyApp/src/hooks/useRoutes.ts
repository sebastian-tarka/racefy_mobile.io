import { useState, useCallback } from 'react';
import { usePaginatedFetch } from './usePaginatedFetch';
import { api } from '../services/api';
import { useRefreshOn } from '../services/refreshEvents';
import type { PlannedRoute } from '../types/api';

type RouteFilter = 'my' | 'popular' | 'nearby';

export function useRoutes() {
  const [filter, setFilter] = useState<RouteFilter>('my');

  // Race-safe paging (usePaginatedFetch): switching the filter while a page is
  // loading used to append the old filter's routes to the new list.
  const {
    data: routes,
    setData: setRoutes,
    isLoading: isFirstLoad,
    isRefreshing: isPullRefresh,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  } = usePaginatedFetch<PlannedRoute>(
    (page) =>
      filter === 'my' ? api.getRoutes({ page }) : api.searchRoutes({ page, per_page: 15 }),
    { deps: [filter], dedupeBy: (r) => r.id, errorMessage: 'Failed to load routes' },
  );

  // Route detail deletes/duplicates outside this list.
  useRefreshOn('routes', refresh);

  const changeFilter = useCallback((newFilter: RouteFilter) => setFilter(newFilter), []);

  const deleteRoute = useCallback(
    async (routeId: number) => {
      try {
        await api.deleteRoute(routeId);
        setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      } catch (err) {
        throw err;
      }
    },
    [setRoutes],
  );

  const duplicateRoute = useCallback(
    async (routeId: number) => {
      try {
        const newRoute = await api.duplicateRoute(routeId);
        setRoutes((prev) => [newRoute, ...prev]);
        return newRoute;
      } catch (err) {
        throw err;
      }
    },
    [setRoutes],
  );

  return {
    routes,
    // Same meaning as before the migration: the first load showed the refresh
    // spinner, "loading" meant fetching a further page.
    isLoading: isLoadingMore,
    isRefreshing: isFirstLoad || isPullRefresh,
    hasMore,
    error,
    filter,
    refresh,
    loadMore,
    changeFilter,
    deleteRoute,
    duplicateRoute,
  };
}
