import React, {createContext, useCallback, useContext, useEffect, useMemo, useState,} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api} from '../services/api';
import {logger} from '../services/logger';
import type {MapStyleConfigResponse} from '../types/api';

const MAP_STYLE_STORAGE_KEY = '@racefy_map_style';

// Fallbacks matching the previous hardcoded MapboxRouteMap behavior, used when
// /config/map-style hasn't loaded yet or the request failed.
const FALLBACK_LIGHT = 'mapbox/outdoors-v12';
const FALLBACK_DARK = 'mapbox/navigation-night-v1';

// Session-level cache for the public config (it changes rarely). Mirrors the
// SPA's single module-level cache.
let _configCache: MapStyleConfigResponse | null = null;
let _configPromise: Promise<MapStyleConfigResponse> | null = null;

async function fetchMapStyleConfig(): Promise<MapStyleConfigResponse> {
  if (_configCache) return _configCache;
  if (!_configPromise) {
    _configPromise = api
      .getMapStyleConfig()
      .then((cfg) => {
        _configCache = cfg;
        return cfg;
      })
      .catch((error) => {
        _configPromise = null; // allow a retry next time
        throw error;
      });
  }
  return _configPromise;
}

// Module-level setter so syncMapStylePreference (called by useAuth on login)
// can update the provider state imperatively — same pattern as useUnits.
let _setPreferenceState: ((style: string | null) => void) | null = null;

/**
 * Sync the map_style preference from the server. Called by useAuth after
 * fetching preferences. Persists locally and updates the live provider state
 * without firing another PUT.
 */
export async function syncMapStylePreference(style: string | null): Promise<void> {
  try {
    if (style) {
      await AsyncStorage.setItem(MAP_STYLE_STORAGE_KEY, style);
    } else {
      await AsyncStorage.removeItem(MAP_STYLE_STORAGE_KEY);
    }
    _setPreferenceState?.(style ?? null);
  } catch (error) {
    logger.error('general', 'Failed to sync map style preference', { error });
  }
}

interface MapStyleContextType {
  /** Full config from /config/map-style, or null until loaded / on failure. */
  config: MapStyleConfigResponse | null;
  /** Available style ids — source of truth for the picker (empty on failure). */
  availableStyles: string[];
  /** Admin default style id (for static images + the "System default" tile). */
  staticStyle: string | null;
  /** User preference: a style id, or null = use system default. */
  preference: string | null;
  /**
   * Persist the preference locally and push to the server (explicit null resets
   * to system default). Optimistic — on failure the state is reverted and the
   * error is re-thrown so the caller can surface a toast.
   */
  setPreference: (style: string | null) => Promise<void>;
  /** Resolve the `mapbox://styles/...` URL for a display map given dark mode. */
  resolveStyleUrl: (isDark: boolean) => string;
}

const MapStyleContext = createContext<MapStyleContextType | null>(null);

export function MapStyleProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<MapStyleConfigResponse | null>(_configCache);
  const [preference, setPreferenceLocal] = useState<string | null>(null);

  // Load the cached preference (instant) + fetch the config once.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(MAP_STYLE_STORAGE_KEY);
        if (saved) setPreferenceLocal(saved);
      } catch (error) {
        logger.debug('general', 'Failed to load map style preference', { error });
      }
    })();

    fetchMapStyleConfig()
      .then(setConfig)
      .catch((error) => logger.warn('api', 'Failed to load map style config', { error }));
  }, []);

  // Register the module-level setter for server-driven syncs.
  useEffect(() => {
    _setPreferenceState = setPreferenceLocal;
    return () => {
      _setPreferenceState = null;
    };
  }, []);

  const setPreference = useCallback(
    async (style: string | null) => {
      const previous = preference;
      setPreferenceLocal(style); // optimistic
      try {
        if (style) {
          await AsyncStorage.setItem(MAP_STYLE_STORAGE_KEY, style);
        } else {
          await AsyncStorage.removeItem(MAP_STYLE_STORAGE_KEY);
        }
        // Explicit null is intentional — it resets to the system default.
        await api.updatePreferences({ map_style: style });
      } catch (error) {
        logger.error('api', 'Failed to update map style preference', { error });
        setPreferenceLocal(previous);
        try {
          if (previous) {
            await AsyncStorage.setItem(MAP_STYLE_STORAGE_KEY, previous);
          } else {
            await AsyncStorage.removeItem(MAP_STYLE_STORAGE_KEY);
          }
        } catch {
          // best-effort revert of the cached value
        }
        throw error;
      }
    },
    [preference]
  );

  const resolveStyleUrl = useCallback(
    (isDark: boolean): string => {
      const fallback = isDark
        ? config?.dynamic_style_dark ?? FALLBACK_DARK
        : config?.dynamic_style_light ?? FALLBACK_LIGHT;
      return `mapbox://styles/${preference ?? fallback}`;
    },
    [preference, config]
  );

  const value = useMemo<MapStyleContextType>(
    () => ({
      config,
      availableStyles: config?.available_styles ?? [],
      staticStyle: config?.static_style ?? null,
      preference,
      setPreference,
      resolveStyleUrl,
    }),
    [config, preference, setPreference, resolveStyleUrl]
  );

  return <MapStyleContext.Provider value={value}>{children}</MapStyleContext.Provider>;
}

export const useMapStyle = () => {
  const context = useContext(MapStyleContext);
  if (!context) {
    throw new Error('useMapStyle must be used within MapStyleProvider');
  }
  return context;
};