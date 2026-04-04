import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { PlannedRoute } from '../types/api';

type RouteFilter = 'my' | 'popular' | 'nearby';

export function useRoutes() {
  const [routes, setRoutes] = useState<PlannedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RouteFilter>('my');

  const fetchRoutes = useCallback(
    async (reset = false) => {
      if (isLoading) return;

      if (reset) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const currentPage = reset ? 1 : page;

        let response;
        if (filter === 'my') {
          response = await api.getRoutes({ page: currentPage });
        } else {
          response = await api.searchRoutes({
            page: currentPage,
            per_page: 15,
          });
        }

        setRoutes((prev) => {
          if (reset) return response.data;
          const existingIds = new Set(prev.map((r) => r.id));
          const newRoutes = response.data.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newRoutes];
        });
        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
        setError('Failed to load routes');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, isLoading, filter]
  );

  const refresh = useCallback(() => fetchRoutes(true), [fetchRoutes]);
  const loadMore = useCallback(
    () => hasMore && !isLoading && fetchRoutes(false),
    [hasMore, isLoading, fetchRoutes]
  );

  const changeFilter = useCallback((newFilter: RouteFilter) => {
    setFilter(newFilter);
    setPage(1);
    setRoutes([]);
    setHasMore(true);
  }, []);

  const deleteRoute = useCallback(async (routeId: number) => {
    try {
      await api.deleteRoute(routeId);
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    } catch (err) {
      throw err;
    }
  }, []);

  const duplicateRoute = useCallback(async (routeId: number) => {
    try {
      const newRoute = await api.duplicateRoute(routeId);
      setRoutes((prev) => [newRoute, ...prev]);
      return newRoute;
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    routes,
    isLoading,
    isRefreshing,
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
