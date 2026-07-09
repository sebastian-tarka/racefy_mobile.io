import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { Event } from '../types/api';

/**
 * Hook to fetch ongoing events where the current user is registered.
 * These are events that can be linked to activities when starting or importing.
 * Uses the dedicated /my-registrations/ongoing-events endpoint for efficiency.
 */
export function useOngoingEvents() {
  const { data, isLoading, error, refetch } = useFetch<Event[]>(() => api.getMyOngoingEvents(), {
    enabled: api.isAuthenticated(),
    initialData: [],
    logCategory: 'general',
    errorMessage: 'Failed to load ongoing events',
  });

  return {
    events: data ?? [],
    isLoading,
    error,
    refresh: refetch,
  };
}
