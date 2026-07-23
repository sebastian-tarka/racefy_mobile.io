import { api } from '../api';
import { logger } from '../logger';
import type { LiveTransport, LiveTransportOptions } from './types';

/**
 * Polling transport — the default, and the only one that works on shared
 * hosting. Polls the snapshot plus (optionally) new messages on a fixed
 * cadence supplied by the server.
 *
 * A `null` snapshot means the broadcast ended or is no longer watchable; both
 * end the feed rather than surfacing an error.
 */
export function createPollingTransport({
  activityId,
  handlers,
  pollIntervalMs,
  withMessages = true,
}: LiveTransportOptions): LiveTransport {
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;
  /** Guards against overlapping ticks when a request outlives the interval. */
  let inFlight = false;
  let lastMessageId = 0;

  const tick = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
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
        // The snapshot is the authoritative live slice; `data` carries the
        // richer record (user, sport type) that the screen renders around it.
        position: snapshot?.position ?? data.position,
        stats: snapshot?.stats ?? data.stats,
        status: snapshot?.status ?? data.status,
        broadcast: data,
      });

      if (withMessages) {
        const messages = await api.getLiveMessages(activityId, lastMessageId || undefined);
        if (stopped) return;
        if (messages.length > 0) {
          lastMessageId = Math.max(lastMessageId, ...messages.map((m) => m.id));
          handlers.onMessages(messages);
        }
      }
    } catch (error: any) {
      if (!stopped) {
        logger.warn('live', 'Polling tick failed', { activityId, error: error?.message });
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      inFlight = false;
    }
  };

  const stop = () => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    name: 'polling',
    start: () => {
      stopped = false;
      tick(); // don't make the user wait a full interval for first paint
      timer = setInterval(tick, pollIntervalMs);
    },
    stop,
  };
}
