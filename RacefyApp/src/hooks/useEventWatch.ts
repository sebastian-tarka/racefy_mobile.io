import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { logger } from '../services/logger';

interface UseEventWatchParams {
  eventId: number;
  isAuthenticated: boolean;
  /** Initial state, typically from `event.is_watching`. */
  initialIsWatching?: boolean;
  /** Called when the watch flag changes so the parent can update its event copy. */
  onChange?: (isWatching: boolean) => void;
  navigateToAuth?: () => void;
}

/**
 * Watch / unwatch an event with an optimistic toggle. Watching is only allowed
 * before registration opens and when the viewer is not registered.
 */
export function useEventWatch({
  eventId,
  isAuthenticated,
  initialIsWatching = false,
  onChange,
  navigateToAuth,
}: UseEventWatchParams) {
  const { t } = useTranslation();
  const [isWatching, setIsWatching] = useState(initialIsWatching);
  const [isToggling, setIsToggling] = useState(false);

  // Keep local state in sync when the parent event reloads.
  useEffect(() => {
    setIsWatching(initialIsWatching);
  }, [initialIsWatching]);

  const toggleWatch = useCallback(async () => {
    if (!isAuthenticated) {
      navigateToAuth?.();
      return;
    }

    const next = !isWatching;
    setIsWatching(next); // optimistic
    setIsToggling(true);
    try {
      if (next) {
        await api.watchEvent(eventId);
      } else {
        await api.unwatchEvent(eventId);
      }
      onChange?.(next);
    } catch (err: unknown) {
      setIsWatching(!next); // revert
      const message =
        err instanceof Error ? err.message : t('eventDetail.watchFailed', 'Could not update');
      logger.error('api', 'Watch toggle failed', { eventId, error: err });
      Alert.alert(t('common.error'), message);
    } finally {
      setIsToggling(false);
    }
  }, [isAuthenticated, isWatching, eventId, onChange, navigateToAuth, t]);

  return { isWatching, isToggling, toggleWatch };
}
