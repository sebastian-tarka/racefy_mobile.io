import { useCallback, useEffect, useRef } from 'react';

interface Options {
  /** How many slides there are. Fewer than two means nothing to advance to. */
  count: number;
  /** The slide currently shown. */
  index: number;
  /** Off while the card should hold still — a playing video, a dragged list. */
  enabled: boolean;
  /** Dwell time per slide. */
  intervalMs?: number;
  onAdvance: (nextIndex: number) => void;
}

/**
 * Moves a carousel on by itself, and gets out of the way the moment a finger
 * lands on it.
 *
 * A timeout chain rather than an interval: the clock restarts from the slide
 * that is actually showing, so a manual swipe gives that slide a full dwell
 * instead of whatever was left of the previous tick. Without that, swiping to a
 * photo can move away from it a few hundred milliseconds later, which reads as
 * the carousel fighting back.
 *
 * Wraps at the end — an auto-advancing strip that stops on the last slide just
 * looks broken.
 */
export function useAutoAdvance({ count, index, enabled, intervalMs = 4500, onAdvance }: Options): {
  pause: () => void;
  resume: () => void;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  // Kept in a ref so restarting the clock never depends on the caller
  // memoising its handler.
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    if (!enabled || pausedRef.current || count < 2) return;
    timer.current = setTimeout(() => {
      onAdvanceRef.current((index + 1) % count);
    }, intervalMs);
  }, [clear, enabled, count, index, intervalMs]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule, clear]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    clear();
  }, [clear]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    schedule();
  }, [schedule]);

  return { pause, resume };
}
