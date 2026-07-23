import { useCallback, useEffect, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import { useAuth } from './useAuth';
import type { LiveVisibility } from '../types/api';

interface Result {
  isBroadcasting: boolean;
  visibility: LiveVisibility | null;
  /** Owner-only token backing the `selected` share link. Null in other modes. */
  shareToken: string | null;
  isBusy: boolean;
  error: Error | null;
  enable: (visibility?: LiveVisibility) => Promise<boolean>;
  disable: () => Promise<boolean>;
  /** Reflect state the caller learned elsewhere (e.g. an activity started with `live`). */
  syncFromServer: (visibility: LiveVisibility | null) => void;
}

/**
 * Athlete-side control over broadcasting for one in-progress activity.
 *
 * Deliberately starts in the OFF state and never turns itself on: a broadcast
 * shows strangers where the athlete physically is, so it may only ever be
 * enabled by an explicit action.
 */
export function useLiveBroadcastControl(activityId: number | null): Result {
  const { user } = useAuth();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [visibility, setVisibility] = useState<LiveVisibility | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const enable = useCallback(
    async (nextVisibility?: LiveVisibility) => {
      if (!activityId) return false;
      setIsBusy(true);
      setError(null);
      try {
        // `visibility` omitted => backend uses the athlete's saved preference.
        const response = await api.toggleLiveBroadcast(activityId, {
          enabled: true,
          ...(nextVisibility ? { visibility: nextVisibility } : {}),
        });
        setIsBroadcasting(true);
        setVisibility(response.data?.live_visibility ?? nextVisibility ?? null);
        // Only present for `selected`; this response is the sole place it is exposed.
        setShareToken(response.data?.live_share_token ?? null);
        logger.info('live', 'Broadcast enabled', {
          activityId,
          visibility: response.data?.live_visibility,
        });
        return true;
      } catch (err: any) {
        logger.error('live', 'Failed to enable broadcast', { activityId, error: err?.message });
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [activityId],
  );

  const disable = useCallback(async () => {
    if (!activityId) return false;
    setIsBusy(true);
    setError(null);
    try {
      await api.toggleLiveBroadcast(activityId, { enabled: false });
      setIsBroadcasting(false);
      setVisibility(null);
      setShareToken(null);
      logger.info('live', 'Broadcast disabled', { activityId });
      return true;
    } catch (err: any) {
      logger.error('live', 'Failed to disable broadcast', { activityId, error: err?.message });
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [activityId]);

  const syncFromServer = useCallback((next: LiveVisibility | null) => {
    setIsBroadcasting(!!next);
    setVisibility(next);
    if (!next) setShareToken(null);
  }, []);

  /**
   * Recover the real broadcast state on mount.
   *
   * After an app restart mid-broadcast the control would otherwise render
   * "off" while the athlete's position was still being shared. For a privacy
   * control that mismatch is the whole ballgame.
   *
   * The athlete's own entry now carries `live_share_token`, so a `selected`
   * broadcast keeps its "send the link" button across restarts.
   */
  useEffect(() => {
    if (!activityId || !user?.id) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.getLiveBroadcasts({ user_id: user.id });
        if (cancelled) return;
        const mine = data.find((b) => b.id === activityId);
        if (mine) {
          logger.info('live', 'Recovered in-progress broadcast state', {
            activityId,
            visibility: mine.live_visibility,
            hasShareToken: !!mine.live_share_token,
          });
          syncFromServer(mine.live_visibility);
          if (mine.live_share_token) setShareToken(mine.live_share_token);
        }
      } catch (err: any) {
        // Non-fatal: the control simply stays in its default off state.
        logger.warn('live', 'Could not recover broadcast state', { error: err?.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, user?.id, syncFromServer]);

  return { isBroadcasting, visibility, shareToken, isBusy, error, enable, disable, syncFromServer };
}
