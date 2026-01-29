import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

export type RefreshEventType = 'feed' | 'events' | 'activities' | 'profile';

const REFRESH_EVENT_PREFIX = 'refresh:';

/**
 * Emit a refresh event to notify list screens that data has changed.
 * Call this after successful mutations (create, update, delete).
 */
export function emitRefresh(type: RefreshEventType): void {
  DeviceEventEmitter.emit(`${REFRESH_EVENT_PREFIX}${type}`);
}

/**
 * Hook that listens for refresh events and calls the callback.
 * Use in list/detail screens to auto-refresh after mutations.
 */
export function useRefreshOn(type: RefreshEventType, callback: () => void): void {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      `${REFRESH_EVENT_PREFIX}${type}`,
      callback
    );
    return () => subscription.remove();
  }, [type, callback]);
}
