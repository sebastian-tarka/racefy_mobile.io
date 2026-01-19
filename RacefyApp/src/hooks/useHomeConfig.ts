import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { HomeConfigResponse, HomeConfigData, HomeConfigMeta, HomeSection } from '../types/api';
import { logger } from '../services/logger';

const HOME_CONFIG_CACHE_KEY = '@racefy_home_config';
const REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Static fallback config when API is unavailable and no cached data exists.
 * This ensures the Home screen always renders something.
 */
const STATIC_FALLBACK_CONFIG: HomeConfigData = {
  primary_cta: {
    action: 'view_events',
    label: 'Explore Events',
  },
  sections: [
    {
      type: 'live_activity',
      priority: 1,
      title: 'Community Activity',
    },
    {
      type: 'upcoming_events',
      priority: 2,
      title: 'Upcoming Events',
    },
  ],
};

const STATIC_FALLBACK_META: HomeConfigMeta = {
  ai_generated: false,
  language: 'en',
};

interface UseHomeConfigResult {
  config: HomeConfigData | null;
  meta: HomeConfigMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Sorted sections by priority (ascending) */
  sortedSections: HomeSection[];
  /** Whether using cached or fallback data */
  isStale: boolean;
}

export function useHomeConfig(): UseHomeConfigResult {
  const [config, setConfig] = useState<HomeConfigData | null>(null);
  const [meta, setMeta] = useState<HomeConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  // Use ref to track if we have config (avoids dependency loop)
  const hasConfigRef = useRef(false);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedConfig = async () => {
      try {
        const cached = await AsyncStorage.getItem(HOME_CONFIG_CACHE_KEY);
        if (cached) {
          const parsed: HomeConfigResponse = JSON.parse(cached);
          setConfig(parsed.data);
          setMeta(parsed.meta);
          setIsStale(true);
          hasConfigRef.current = true;
          logger.debug('general', 'Loaded cached home config');
        }
      } catch (err) {
        logger.warn('general', 'Failed to load cached home config', { error: err });
      }
    };

    loadCachedConfig();
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      logger.debug('general', 'Fetching home config');

      const response = await api.getHomeConfig();

      setConfig(response.data);
      setMeta(response.meta);
      setError(null);
      setIsStale(false);
      hasConfigRef.current = true;

      // Cache the response
      try {
        await AsyncStorage.setItem(HOME_CONFIG_CACHE_KEY, JSON.stringify(response));
        logger.debug('general', 'Cached home config');
      } catch (cacheError) {
        logger.warn('general', 'Failed to cache home config', { error: cacheError });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load home config';
      setError(errorMessage);
      logger.error('general', 'Failed to fetch home config', { error: err });

      // If we have no config at all, use static fallback
      if (!hasConfigRef.current) {
        logger.info('general', 'Using static fallback config');
        setConfig(STATIC_FALLBACK_CONFIG);
        setMeta(STATIC_FALLBACK_META);
        setIsStale(true);
        hasConfigRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies - stable callback

  // Initial load (runs once)
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      logger.debug('general', 'Auto-refreshing home config');
      fetchConfig();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchConfig]);

  // Refresh when app returns to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.debug('general', 'App became active, refreshing home config');
        fetchConfig();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [fetchConfig]);

  // Sort sections by priority (ascending)
  const sortedSections = (config?.sections || [])
    .slice()
    .sort((a, b) => a.priority - b.priority);

  return {
    config,
    meta,
    loading,
    error,
    refetch: fetchConfig,
    sortedSections,
    isStale,
  };
}