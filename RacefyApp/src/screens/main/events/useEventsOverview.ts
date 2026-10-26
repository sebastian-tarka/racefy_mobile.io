import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import type {
  Event,
  EventOverview,
  EventStats,
  EventWithLatestCommentary,
} from '../../../types/api';

const LIVE_VIEW_MODE_KEY = '@racefy_events_live_view_mode';
export type LiveViewMode = 'compact' | 'detailed';

/**
 * The "All" view of the Events screen: three events per status, the overview
 * counts, the athlete's own event stats, and the live section's view mode
 * (remembered on the device).
 */
export function useEventsOverview(isAuthenticated: boolean) {
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [liveEventsDetailed, setLiveEventsDetailed] = useState<EventWithLatestCommentary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [eventOverview, setEventOverview] = useState<EventOverview | null>(null);

  // Live view mode (compact = default, detailed = with cover + AI commentary)
  const [liveViewMode, setLiveViewMode] = useState<LiveViewMode>('compact');

  useEffect(() => {
    AsyncStorage.getItem(LIVE_VIEW_MODE_KEY).then((val) => {
      if (val === 'compact' || val === 'detailed') {
        setLiveViewMode(val);
      }
    });
  }, []);

  const toggleLiveViewMode = useCallback(() => {
    const newMode: LiveViewMode = liveViewMode === 'compact' ? 'detailed' : 'compact';
    setLiveViewMode(newMode);
    AsyncStorage.setItem(LIVE_VIEW_MODE_KEY, newMode);
  }, [liveViewMode]);

  const fetchOverviewData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [ongoingRes, upcomingRes, completedRes, overview, stats] = await Promise.all([
        api.getEvents({ status: 'ongoing', per_page: 3 }),
        api.getEvents({ status: 'upcoming', per_page: 3 }),
        api.getEvents({ status: 'completed', per_page: 3 }),
        api.getEventOverview(),
        isAuthenticated ? api.getEventStats() : Promise.resolve(null),
      ]);

      setOngoingEvents(ongoingRes.data);
      setUpcomingEvents(upcomingRes.data);
      setCompletedEvents(completedRes.data);
      setEventOverview(overview);
      setEventStats(stats);

      // Fetch detailed live events (with commentary) for detailed mode
      if (ongoingRes.data.length > 0) {
        try {
          const homeData = await api.getHome({
            include_activities: false,
            include_upcoming: false,
          });
          setLiveEventsDetailed(homeData.live_events || []);
        } catch {
          setLiveEventsDetailed(ongoingRes.data as EventWithLatestCommentary[]);
        }
      } else {
        setLiveEventsDetailed([]);
      }
    } catch (err) {
      logger.debug('api', 'Failed to fetch overview data', { error: err });
    } finally {
      setStatsLoading(false);
    }
  }, [isAuthenticated]);

  return {
    ongoingEvents,
    upcomingEvents,
    completedEvents,
    liveEventsDetailed,
    statsLoading,
    eventStats,
    eventOverview,
    liveViewMode,
    toggleLiveViewMode,
    fetchOverviewData,
  };
}

export type EventsOverviewData = ReturnType<typeof useEventsOverview>;
