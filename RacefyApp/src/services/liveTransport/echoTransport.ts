import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import { api } from '../api';
import { logger } from '../logger';
import { API_BASE_URL } from '../../config/api';
import type { LiveTransport, LiveTransportOptions } from './types';
import type { LiveBroadcastStats, LiveMessage, RealtimeConfig } from '../../types/api';

// Echo looks for Pusher on the global object. React Native has no `window`,
// so this is attached to globalThis, which exists in both environments.
(globalThis as any).Pusher = Pusher;

/** Payload of the `live.position` event. Flat, unlike the REST snapshot. */
interface LivePositionEvent {
  activity_id: number;
  position: [number, number] | null;
  status: string;
  distance: number;
  duration: number;
  elevation_gain: number;
  avg_speed: string | number;
  current_pace: number | null;
}

/**
 * Reverb (Laravel Echo) transport.
 *
 * Subscribes to the PRIVATE `activity.{id}` channel, which carries position
 * updates, `live.ended`, and PUBLIC messages only. Private 1:1 messages are
 * delivered exclusively on `activity.{id}.athlete` and are therefore invisible
 * here by design — a spectator must never receive them.
 *
 * Position events are throttled server-side to roughly one per 10s, so this is
 * less chatty than polling but not real-time to the second.
 */
export function createEchoTransport(
  realtime: RealtimeConfig,
  { activityId, handlers, withMessages = true }: LiveTransportOptions,
): LiveTransport {
  let echo: Echo<'pusher'> | null = null;
  let stopped = false;

  /**
   * Echo only ever delivers deltas, so the screen would otherwise have no
   * athlete, no sport and no stats until the first throttled position event
   * (~10s away, and never at all if the athlete is standing still). This is
   * exactly what `GET /live/{id}` exists for — "snapshot for a joining
   * spectator" — and it also catches a broadcast that ended before we
   * subscribed, which no channel event would ever tell us about.
   */
  const loadInitialSnapshot = async () => {
    try {
      const result = await api.getLiveBroadcast(activityId);
      if (stopped) return;
      if (!result) {
        handlers.onEnded();
        stop();
        return;
      }
      const { data, snapshot } = result;
      handlers.onUpdate({
        position: snapshot?.position ?? data.position,
        stats: snapshot?.stats ?? data.stats,
        status: snapshot?.status ?? data.status,
        broadcast: data,
      });

      // The channel only carries messages sent from now on, so anything said
      // before joining has to come over REST once.
      if (withMessages) {
        const history = await api.getLiveMessages(activityId);
        if (!stopped && history.length > 0) handlers.onMessages(history);
      }
    } catch (error: any) {
      if (!stopped) {
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  const start = () => {
    stopped = false;
    const config = realtime.reverb;
    if (!config) {
      handlers.onError(new Error('Reverb driver selected but no connection details were sent'));
      return;
    }

    loadInitialSnapshot();

    try {
      echo = new Echo({
        broadcaster: 'pusher',
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === 'https',
        enabledTransports: config.scheme === 'https' ? ['wss'] : ['ws'],
        disableStats: true,
        // Private channels are authorized by the API, using the same bearer
        // token as every other request.
        authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${api.getToken() ?? ''}`,
            Accept: 'application/json',
          },
        },
      });

      const channel = echo.private(`activity.${activityId}`);

      // Event names are `broadcastAs` values, which Echo requires to be
      // prefixed with a dot.
      channel.listen('.live.position', (event: LivePositionEvent) => {
        if (stopped) return;
        const stats: LiveBroadcastStats = {
          distance: event.distance,
          duration: event.duration,
          elevation_gain: event.elevation_gain,
          avg_speed: event.avg_speed,
          current_pace: event.current_pace,
        };
        handlers.onUpdate({
          position: event.position,
          stats,
          status: event.status,
          // No full broadcast record on this channel — the screen keeps the one
          // it already loaded over REST.
        });
      });

      channel.listen('.live.message', (event: LiveMessage) => {
        if (stopped) return;
        handlers.onMessages([event]);
      });

      channel.listen('.live.ended', () => {
        if (stopped) return;
        handlers.onEnded();
        stop();
      });

      logger.info('live', 'Echo transport subscribed', { activityId });
    } catch (error: any) {
      logger.error('live', 'Failed to start Echo transport', { activityId, error: error?.message });
      handlers.onError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const stop = () => {
    stopped = true;
    try {
      echo?.leave(`activity.${activityId}`);
      echo?.disconnect();
    } catch (error: any) {
      logger.warn('live', 'Error tearing down Echo transport', { error: error?.message });
    }
    echo = null;
  };

  return { name: 'reverb', start, stop };
}
