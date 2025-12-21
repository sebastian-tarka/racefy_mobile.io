import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Event } from '../types/api';

type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(
    undefined
  );

  const fetchEvents = useCallback(
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
        const response = await api.getEvents({
          status: statusFilter,
          page: currentPage,
        });

        setEvents((prev) =>
          reset ? response.data : [...prev, ...response.data]
        );
        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, isLoading, statusFilter]
  );

  const refresh = useCallback(() => fetchEvents(true), [fetchEvents]);
  const loadMore = useCallback(
    () => hasMore && !isLoading && fetchEvents(false),
    [hasMore, isLoading, fetchEvents]
  );

  const changeFilter = useCallback((status: EventStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
    setEvents([]);
    setHasMore(true);
  }, []);

  const registerForEvent = useCallback(async (eventId: number) => {
    try {
      await api.registerForEvent(eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                is_registered: true,
                participants_count: e.participants_count + 1,
              }
            : e
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  const cancelRegistration = useCallback(async (eventId: number) => {
    try {
      await api.cancelEventRegistration(eventId);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                is_registered: false,
                participants_count: e.participants_count - 1,
              }
            : e
        )
      );
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    events,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    statusFilter,
    refresh,
    loadMore,
    changeFilter,
    registerForEvent,
    cancelRegistration,
  };
}
