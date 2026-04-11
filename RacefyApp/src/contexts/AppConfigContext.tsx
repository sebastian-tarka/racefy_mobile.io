import React, {createContext, useCallback, useContext, useEffect, useRef, useState,} from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import * as Application from 'expo-application';
import {api} from '../services/api';
import {logger} from '../services/logger';
import {pushNotificationService} from '../services/pushNotifications';
import type {AppConfigQuery, AppConfigResponse} from '../types/api';

/**
 * Native binary version (NOT the JS bundle / OTA version).
 * Falls back to "0.0.0" so version checks fail open if expo-application
 * can't read the value (e.g. in some bare Expo Go scenarios).
 */
const NATIVE_APP_VERSION = Application.nativeApplicationVersion ?? '0.0.0';

const APP_CONFIG_QUERY: AppConfigQuery = {
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  app_version: NATIVE_APP_VERSION,
};

interface AppConfigContextValue {
  /** Full server config (null before first successful fetch). */
  config: AppConfigResponse | null;
  /** True until the first fetch attempt resolves. */
  isLoading: boolean;
  /** Last error from a failed fetch (cleared on success). */
  error: Error | null;
  /** Force a re-fetch. */
  refresh: () => Promise<void>;

  // ---- Maintenance slice (denormalized for cheap selector access) ----
  isMaintenanceMode: boolean;
  maintenanceMessage: string | null;
  maintenanceEstimatedEnd: string | null;
}

const AppConfigContext = createContext<AppConfigContextValue>({
  config: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
  isMaintenanceMode: false,
  maintenanceMessage: null,
  maintenanceEstimatedEnd: null,
});

const MAINTENANCE_POLL_INTERVAL = 30_000; // 30s — only while in maintenance

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Maintenance slice — kept in separate state so 503 fallback handler
  // can flip it without needing a fresh /config/app fetch.
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);
  const [maintenanceEstimatedEnd, setMaintenanceEstimatedEnd] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.getAppConfig(APP_CONFIG_QUERY);
      setConfig(fresh);
      setError(null);

      // Update maintenance slice
      if (fresh.maintenance?.enabled) {
        setIsMaintenanceMode(true);
        setMaintenanceMessage(fresh.maintenance.message);
        setMaintenanceEstimatedEnd(fresh.maintenance.estimated_end);
      } else {
        setIsMaintenanceMode(false);
        setMaintenanceMessage(null);
        setMaintenanceEstimatedEnd(null);
      }

      // Inject push config into the push service so it doesn't need to
      // fetch /config/app on its own.
      pushNotificationService.setPushConfig(fresh.push);
    } catch (err: any) {
      // 503 with maintenance flag — flip into maintenance mode without
      // treating it as a hard error.
      if (err?.status === 503 && err?.maintenance) {
        setIsMaintenanceMode(true);
        setMaintenanceMessage(err.message ?? null);
        setMaintenanceEstimatedEnd(err.estimated_end ?? null);
        setError(null);
      } else {
        logger.error('api', 'Failed to fetch app config', { error: err });
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 503 handler used by the API base layer for ANY request.
  const handleMaintenanceResponse = useCallback(
    (data: { message?: string; estimated_end?: string }) => {
      setIsMaintenanceMode(true);
      setMaintenanceMessage(data.message ?? null);
      setMaintenanceEstimatedEnd(data.estimated_end ?? null);
    },
    []
  );

  // Initial fetch on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // While in maintenance, poll periodically so the user is unblocked
  // automatically once the backend recovers.
  useEffect(() => {
    if (isMaintenanceMode) {
      pollTimer.current = setInterval(refresh, MAINTENANCE_POLL_INTERVAL);
    } else if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [isMaintenanceMode, refresh]);

  // Re-check when the app returns to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  // Wire the API base layer's maintenance hook.
  useEffect(() => {
    api.setOnMaintenanceMode(handleMaintenanceResponse);
    return () => api.setOnMaintenanceMode(null);
  }, [handleMaintenanceResponse]);

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        error,
        refresh,
        isMaintenanceMode,
        maintenanceMessage,
        maintenanceEstimatedEnd,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}