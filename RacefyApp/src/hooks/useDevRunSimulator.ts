import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';

/** Simulated run cadence: +350 m every 10 s (≈ 1 km every ~29 s). */
const STEP_DISTANCE_M = 350;
const STEP_INTERVAL_MS = 10_000;

/** Constant simulated pace (5:30 min/km). */
const SIM_PACE_MIN_PER_KM = 5.5;

const BG_SIM_START_KEY = '@racefy:audioCoach:bgSimStartTime';
const BG_LAST_THRESHOLD_KEY = '@racefy:audioCoach:bgLastThreshold';

/** Distance (m) covered after `elapsedMs` of simulated running — pure, stepwise. */
export function simulatedDistanceM(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / STEP_INTERVAL_MS) * STEP_DISTANCE_M;
}

export interface DevRunSimulator {
  /** Whether the simulated run is active. */
  running: boolean;
  /** Toggle the simulated run on/off. */
  toggle: () => void;
  /** Simulated distance so far, in metres / kilometres. */
  distanceM: number;
  distanceKm: number;
  /** Simulated pace in min/km (constant). */
  pace: number;
}

/**
 * DEV-ONLY simulated run for exercising the audio coach without moving. Time-based
 * distance is recomputed on every render from elapsed time (correct even after a
 * background resume); a 10 s foreground tick forces those re-renders, and the
 * background task reads the sim flag from AsyncStorage. Extracted verbatim from
 * ActivityRecordingScreen to keep that screen focused on real recording.
 */
export function useDevRunSimulator(): DevRunSimulator {
  const [running, setRunning] = useState(false);
  const startRef = useRef(0);
  const bgStartedRef = useRef(false);
  const [, setTick] = useState(0);

  // Distance from elapsed time — correct on every render, even after background resume.
  const distanceM =
    running && startRef.current > 0 ? simulatedDistanceM(Date.now() - startRef.current) : 0;

  useEffect(() => {
    if (!__DEV__ || !running) return;
    const startTime = Date.now();
    startRef.current = startTime;
    bgStartedRef.current = false;

    logger.info('audioCoach', 'DEV SimRun: starting...');

    // 1. Write sim flag to AsyncStorage — background task reads it
    AsyncStorage.setItem(BG_SIM_START_KEY, startTime.toString())
      .then(() => logger.info('audioCoach', 'DEV SimRun: sim flag written'))
      .catch((e) =>
        logger.error('audioCoach', 'DEV SimRun: failed to write sim flag', { error: e }),
      );

    // 2. Start lightweight background tracking (foreground service).
    // Dynamic import — backgroundLocation.ts has TaskManager.defineTask at module
    // level and cannot be statically imported from React components.
    import('../services/backgroundLocation')
      .then((m) => m.startSimBackgroundTracking())
      .then((ok) => {
        bgStartedRef.current = ok;
        logger.info('audioCoach', `DEV SimRun: bg tracking ${ok ? 'STARTED' : 'FAILED'}`);
      })
      .catch((e) =>
        logger.error('audioCoach', 'DEV SimRun: bg tracking error', { error: String(e) }),
      );

    // 3. Foreground re-render tick
    const interval = setInterval(() => {
      setTick((t) => {
        const dist = simulatedDistanceM(Date.now() - startRef.current);
        logger.info('audioCoach', `DEV SimRun tick: ${dist}m (${(dist / 1000).toFixed(2)}km)`);
        return t + 1;
      });
    }, STEP_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      AsyncStorage.removeItem(BG_SIM_START_KEY);
      AsyncStorage.setItem(BG_LAST_THRESHOLD_KEY, '0');
      if (bgStartedRef.current) {
        import('../services/backgroundLocation').then((m) => m.stopBackgroundLocationTracking());
      }
    };
  }, [running]);

  const toggle = useCallback(() => setRunning((prev) => !prev), []);

  return { running, toggle, distanceM, distanceKm: distanceM / 1000, pace: SIM_PACE_MIN_PER_KM };
}
