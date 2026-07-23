import { logger } from '../logger';
import { createPollingTransport } from './pollingTransport';
import { createEchoTransport } from './echoTransport';
import type { LiveTransport, LiveTransportOptions } from './types';
import type { RealtimeConfig } from '../../types/api';

export * from './types';
export { createPollingTransport } from './pollingTransport';
export { createEchoTransport } from './echoTransport';

/** Fallback cadence when the server sends no realtime block at all. */
const DEFAULT_POLL_INTERVAL_MS = 5000;

/**
 * Picks the transport from the server-supplied realtime config.
 *
 * `reverb` is not implemented yet, so it degrades to polling rather than
 * leaving the screen blank — the driver is flipped server-side and can reach a
 * build that predates Echo support.
 */
export function createLiveTransport(
  realtime: RealtimeConfig | undefined,
  options: Omit<LiveTransportOptions, 'pollIntervalMs'> & { pollIntervalMs?: number },
): LiveTransport {
  const pollIntervalMs =
    options.pollIntervalMs ?? realtime?.poll_interval_ms ?? DEFAULT_POLL_INTERVAL_MS;

  if (realtime?.driver === 'reverb') {
    if (realtime.reverb) {
      return createEchoTransport(realtime, { ...options, pollIntervalMs });
    }
    // Falling back rather than failing: the driver is flipped server-side and
    // an incomplete config must not leave the user with a blank screen.
    logger.warn('live', 'Driver is reverb but no connection details were sent; using polling');
  }

  return createPollingTransport({ ...options, pollIntervalMs });
}
