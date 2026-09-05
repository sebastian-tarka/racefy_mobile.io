import { useCallback, useEffect, useState } from 'react';
import type { WorkoutCuePrefs } from '../types/workout';
import { DEFAULT_WORKOUT_CUE_PREFS } from '../types/workout';
import { loadWorkoutCuePrefs, saveWorkoutCuePrefs } from '../services/workout/storage';

/**
 * Which workout cues the athlete wants (voice / tone / haptics / halfway /
 * countdown). Local-only: persisted in AsyncStorage, read by the background
 * task from the same place.
 */
export function useWorkoutCuePrefs() {
  const [prefs, setPrefs] = useState<WorkoutCuePrefs>(DEFAULT_WORKOUT_CUE_PREFS);

  useEffect(() => {
    let cancelled = false;
    loadWorkoutCuePrefs().then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback((partial: Partial<WorkoutCuePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      void saveWorkoutCuePrefs(next);
      return next;
    });
  }, []);

  return { prefs, updatePrefs };
}
