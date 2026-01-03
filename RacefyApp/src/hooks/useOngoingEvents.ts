import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { Event } from '../types/api';

/**
 * Hook to fetch ongoing events where the current user is registered.
 * These are events that can be linked to activities when starting or importing.
 * Uses the dedicated /my-registrations/ongoing-events endpoint for efficiency.
 */
export function useOngoingEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOngoingEvents = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ongoingEvents = await api.getMyOngoingEvents();
      setEvents(ongoingEvents);
    } catch (err: any) {
      console.error('Failed to fetch ongoing events:', err);
      setError(err.message || 'Failed to load ongoing events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchOngoingEvents();
  }, [fetchOngoingEvents]);

  return {
    events,
    isLoading,
    error,
    refresh: fetchOngoingEvents,
  };
}
