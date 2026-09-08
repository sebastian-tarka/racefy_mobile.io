import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';
import type { SportTypeWithIcon } from './useSportTypes';

const STORAGE_KEY = '@racefy:sportShortcuts:v1';

/** The pre-start rail holds this many sports before "All sports" takes over. */
export const MAX_SPORT_SHORTCUTS = 6;

interface UseSportShortcuts {
  /** The sports on the rail, in the athlete's own order. */
  shortcuts: SportTypeWithIcon[];
  /** Raw ids — what the manager edits. Empty until loaded. */
  ids: number[];
  setIds: (ids: number[]) => void;
  loaded: boolean;
}

/**
 * Which sports sit on the pre-start rail (design "Racefy v2" → PreStartScreen).
 *
 * The catalogue has far more sports than fit one horizontal row, and an athlete
 * uses two or three of them. Rather than paginate the grid, the rail holds the
 * handful they pick and everything else lives behind "All sports".
 *
 * Stored locally on purpose: it is a per-device convenience, not profile data,
 * so it must survive an offline start with no round trip.
 */
export function useSportShortcuts(sportTypes: SportTypeWithIcon[]): UseSportShortcuts {
  const [ids, setStoredIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!cancelled && Array.isArray(parsed)) {
          setStoredIds(parsed.filter((id): id is number => typeof id === 'number'));
        }
      } catch (err) {
        logger.warn('activity', 'Failed to read sport shortcuts', { error: err });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setIds = useCallback((next: number[]) => {
    const capped = next.slice(0, MAX_SPORT_SHORTCUTS);
    setStoredIds(capped);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(capped)).catch((err) => {
      logger.warn('activity', 'Failed to persist sport shortcuts', { error: err });
    });
  }, []);

  const shortcuts = useMemo(() => {
    // Nothing chosen yet (or every chosen sport has since disappeared from the
    // catalogue): fall back to the first few sports the API returned, which are
    // already ordered by how common they are.
    const picked = ids
      .map((id) => sportTypes.find((s) => s.id === id))
      .filter((s): s is SportTypeWithIcon => !!s);
    return picked.length ? picked : sportTypes.slice(0, MAX_SPORT_SHORTCUTS - 1);
  }, [ids, sportTypes]);

  return { shortcuts, ids, setIds, loaded };
}
