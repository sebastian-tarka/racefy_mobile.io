import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';

interface Result {
  isMuted: boolean;
  /** True while a write is in flight — the control stays disabled so the label cannot flicker. */
  isToggling: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
}

/**
 * Whether this athlete's broadcast notifications are silenced for me.
 *
 * The state is read on open from `/mute-notifications/status` rather than from
 * the profile payload, because it belongs to the viewer, not the profile.
 *
 * Both writes are idempotent, so a double tap is harmless — but the control is
 * held disabled while one is in flight so the label does not flip back and
 * forth between "Mute" and "Unmute".
 */
export function useNotificationMute(userId: number | null, enabled = true): Result {
  const [isMuted, setIsMuted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    setIsLoading(true);
    api
      .getUserNotificationMuteStatus(userId)
      .then((res) => {
        if (!cancelled) setIsMuted(!!res.muted);
      })
      .catch((error) => {
        // Not knowing means showing "Mute", which is the safe default: the
        // worst case is a second mute call, and that one is idempotent.
        logger.warn('api', 'Failed to read notification mute status', { error });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  const toggle = useCallback(async () => {
    if (!userId || isToggling) return;
    const next = !isMuted;
    setIsToggling(true);
    setIsMuted(next);
    try {
      if (next) {
        await api.muteUserNotifications(userId);
      } else {
        await api.unmuteUserNotifications(userId);
      }
    } catch (error) {
      setIsMuted(!next);
      logger.error('api', 'Failed to toggle notification mute', { error });
      throw error;
    } finally {
      setIsToggling(false);
    }
  }, [userId, isMuted, isToggling]);

  return { isMuted, isToggling, isLoading, toggle };
}
