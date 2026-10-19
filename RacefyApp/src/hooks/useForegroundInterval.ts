import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * setInterval that runs only while the app is in the foreground.
 *
 * Polling hooks on always-mounted tabs (Home, Feed, Profile) used to keep hitting the
 * API every 30–60 s in the background — and during a recording the JS runtime stays
 * alive in the background for hours (foreground service). Here the timer stops when
 * the app leaves the foreground; on return it calls `callback` at once (the data is
 * stale by then) and resumes.
 *
 * `intervalMs` null/0 disables it. The latest `callback` is always used, so it need not
 * be stable.
 */
export function useForegroundInterval(callback: () => void, intervalMs: number | null): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!intervalMs) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => callbackRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (!timer) callbackRef.current();
        start();
      } else {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [intervalMs]);
}
