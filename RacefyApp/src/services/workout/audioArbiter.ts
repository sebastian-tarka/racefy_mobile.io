/**
 * Keeps the audio coach's per-kilometre split from talking over a workout cue.
 *
 * A "kilometre 5, pace 5:12" split that lands within a few seconds of "goal
 * reached" is audio clutter — the athlete gets one sentence, not two, and the
 * workout cue is the one they set up on purpose. The split is dropped for
 * that kilometre (its threshold still advances, so it isn't replayed later).
 *
 * The window is tracked in memory for the foreground and mirrored to storage
 * for the headless background task, which starts with a fresh module registry.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const SPLIT_SUPPRESS_WINDOW_MS = 3000;

const LAST_CUE_KEY = '@racefy:workout:lastCueMs';

let lastWorkoutCueMs = 0;

/** Call whenever a spoken workout cue is issued. */
export function markWorkoutCue(nowMs: number = Date.now()): void {
  lastWorkoutCueMs = nowMs;
  AsyncStorage.setItem(LAST_CUE_KEY, String(nowMs)).catch(() => {});
}

/** Synchronous check for the foreground hook. */
export function isSplitSuppressed(nowMs: number = Date.now()): boolean {
  return nowMs - lastWorkoutCueMs < SPLIT_SUPPRESS_WINDOW_MS;
}

/** Storage-backed check for the background task. */
export async function isSplitSuppressedAsync(nowMs: number = Date.now()): Promise<boolean> {
  if (isSplitSuppressed(nowMs)) return true;
  try {
    const raw = await AsyncStorage.getItem(LAST_CUE_KEY);
    const ms = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(ms) && nowMs - ms < SPLIT_SUPPRESS_WINDOW_MS;
  } catch {
    return false;
  }
}

/** Test hook. */
export function resetAudioArbiter(): void {
  lastWorkoutCueMs = 0;
}
