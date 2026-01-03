import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import type { Event, EventRegistration } from '../types/api';

/**
 * Hook to fetch ongoing events where the current user is registered.
 * These are events that can be linked to activities when starting or importing.
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
      // Fetch user's registrations
      const registrations = await api.getMyRegistrations();

      // Filter for active registrations (registered or attended)
      const activeRegistrations = registrations.filter(
        (reg: EventRegistration) =>
          reg.status === 'registered' || reg.status === 'attended'
      );

      // Get the events from registrations and filter for ongoing ones
      const ongoingEvents = activeRegistrations
        .filter((reg: EventRegistration) => reg.event?.status === 'ongoing')
        .map((reg: EventRegistration) => reg.event!)
        .filter((event): event is Event => event !== undefined);

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
