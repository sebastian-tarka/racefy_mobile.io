import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { usePaginatedFetch } from './usePaginatedFetch';
import type { Event } from '../types/api';

type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export function useEvents() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | undefined>(undefined);

  const {
    data: events,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
    setData,
  } = usePaginatedFetch<Event>((page) => api.getEvents({ status: statusFilter, page }), {
    // EventsScreen drives the initial load and the post-filter refresh itself,
    // so the hook must not auto-fetch (that would double-request).
    autoLoad: false,
    dedupeBy: (e) => e.id,
    errorMessage: 'Failed to load events',
  });

  const changeFilter = useCallback(
    (status: EventStatus | undefined) => {
      setStatusFilter(status);
      reset();
    },
    [reset],
  );

  const registerForEvent = useCallback(
    async (eventId: number) => {
      await api.registerForEvent(eventId);
      setData((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, is_registered: true, participants_count: e.participants_count + 1 }
            : e,
        ),
      );
    },
    [setData],
  );

  const cancelRegistration = useCallback(
    async (eventId: number) => {
      await api.cancelEventRegistration(eventId);
      setData((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, is_registered: false, participants_count: e.participants_count - 1 }
            : e,
        ),
      );
    },
    [setData],
  );

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
