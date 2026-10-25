import { useEffect } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import type { OutboxEvent } from '../services/strength/sessionOutbox';
import { STRENGTH_OUTBOX_EVENT, strengthOutbox } from '../services/strength/strengthOutbox';

/** Retry cadence while something waits — NetInfo misses a network that is up but dead. */
const RETRY_INTERVAL_MS = 30_000;

/**
 * Owns WHEN the strength outbox is sent outside the session screen (which
 * flushes on every tap itself): sign-in, network regained, back to the
 * foreground, and a slow retry while anything is queued. Mounted once, next to
 * the activity finish-sync runner.
 */
export function useStrengthOutboxRunner(isAuthenticated: boolean) {
  useEffect(() => {
    if (isAuthenticated && strengthOutbox.hasPending()) void strengthOutbox.flush();
  }, [isAuthenticated]);

  // A session closed offline became an activity: lists and the feed are stale.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(STRENGTH_OUTBOX_EVENT, (e: OutboxEvent) => {
      if (e.type !== 'completed') return;
      logger.info('api', 'Strength session delivered', { sessionId: e.sessionId });
      emitRefresh('workouts');
      emitRefresh('activities');
      emitRefresh('feed');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let wasReachable: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = !!state.isConnected && state.isInternetReachable !== false;
      const regained = wasReachable === false && reachable;
      wasReachable = reachable;
      if (regained && strengthOutbox.hasPending()) void strengthOutbox.flush();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active' && strengthOutbox.hasPending()) void strengthOutbox.flush();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && strengthOutbox.hasPending()) {
        void strengthOutbox.flush();
      }
    }, RETRY_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
}
