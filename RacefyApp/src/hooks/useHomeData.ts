import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { HomeData, CommentaryLanguage } from '../types/api';
import { logger } from '../services/logger';

const HOME_DATA_CACHE_KEY = '@racefy_home_data';
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

interface UseHomeDataOptions {
  language?: CommentaryLanguage;
  perPage?: number;
  includeActivities?: boolean;
  includeUpcoming?: boolean;
  enableAutoRefresh?: boolean;
}

export function useHomeData(options: UseHomeDataOptions = {}) {
  const {
    language = 'en',
    perPage = 15,
    includeActivities = true,
    includeUpcoming = false,
    enableAutoRefresh = true,
  } = options;

  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(HOME_DATA_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setData(parsed);
          logger.debug('home', 'Loaded cached home data', {
            cached_at: parsed.meta?.cached_at,
          });
        }
      } catch (err) {
        logger.warn('home', 'Failed to load cached home data', { error: err });
      }
    };

    loadCachedData();
  }, []);

  const fetchHome = useCallback(async () => {
    try {
      logger.debug('home', 'Fetching home data', {
        language,
        perPage,
        includeActivities,
        includeUpcoming,
      });

      const result = await api.getHome({
        language,
        per_page: perPage,
        include_activities: includeActivities,
        include_upcoming: includeUpcoming,
      });

      setData(result);
      setError(null);
      setLastFetchTime(new Date());

      // Persist to AsyncStorage for offline support
      try {
        await AsyncStorage.setItem(HOME_DATA_CACHE_KEY, JSON.stringify(result));
        logger.debug('home', 'Cached home data', {
          cache_key: result.meta?.cache_key,
        });
      } catch (cacheError) {
        logger.warn('home', 'Failed to cache home data', { error: cacheError });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load feed';
      setError(errorMessage);
      logger.error('home', 'Failed to fetch home data', { error: err });

      // Don't clear data on error - keep showing stale data
      if (!data) {
        // Only set error state if we have no data at all
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [language, perPage, includeActivities, includeUpcoming, data]);

  // Initial load
  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  // Auto-refresh for live events (30s interval)
  useEffect(() => {
    if (!enableAutoRefresh) return;
    if (!data?.live_events?.length) return; // No polling if no live events

    const interval = setInterval(() => {
      logger.debug('home', 'Auto-refreshing home data');
      fetchHome();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, data?.live_events, fetchHome]);

  // Handle AppState changes (pause polling in background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.debug('home', 'App became active, refreshing home data');
        fetchHome(); // Refresh when app returns to foreground
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [fetchHome]);

  return {
    data,
    loading,
    error,
    refetch: fetchHome,
    lastFetchTime,
    // Helpers
    liveEvents: data?.live_events || [],
    upcomingEvents: data?.upcoming_events || [],
    recentActivities: data?.recent_activities || [],
    hasLiveEvents: (data?.live_events?.length || 0) > 0,
    meta: data?.meta,
  };
}