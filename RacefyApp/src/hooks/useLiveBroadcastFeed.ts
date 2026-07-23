import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useAppConfig } from '../contexts/AppConfigContext';
import { createLiveTransport } from '../services/liveTransport';
import { logger } from '../services/logger';
import type { LiveBroadcast, LiveBroadcastStats, LiveMessage, LivePosition } from '../types/api';

/** A point on the locally stitched trail, in the [lng, lat] order the API uses. */
export interface TrailPoint {
  lng: number;
  lat: number;
}

export type LiveFeedStatus = 'connecting' | 'live' | 'ended' | 'error';

interface Options {
  /** Set false to keep the feed torn down (e.g. screen not focused). */
  enabled?: boolean;
  withMessages?: boolean;
}

interface Result {
  broadcast: LiveBroadcast | null;
  position: LivePosition;
  stats: LiveBroadcastStats | null;
  /**
   * The route drawn so far, stitched from positions that arrived while watching.
   *
   * Deliberately starts empty: the API exposes only the athlete's latest visible
   * position and there is no history endpoint, so joining late means joining the
   * line mid-way. Back-filling would also resurrect positions that privacy
   * zones removed.
   */
  trail: TrailPoint[];
  messages: LiveMessage[];
  status: LiveFeedStatus;
  error: Error | null;
  /** True while the athlete is inside a privacy zone — show "position hidden". */
  isPositionHidden: boolean;
  transport: 'polling' | 'reverb' | null;
}

export function useLiveBroadcastFeed(
  activityId: number | null,
  { enabled = true, withMessages = true }: Options = {},
): Result {
  const { config } = useAppConfig();
  const realtime = config?.realtime;

  /**
   * The effect below keys off these primitives, never off `realtime` itself:
   * any caller handing back a fresh config object each render would otherwise
   * tear down and rebuild the transport in a loop.
   */
  const driver = realtime?.driver;
  const pollIntervalMs = realtime?.poll_interval_ms;
  const realtimeRef = useRef(realtime);
  realtimeRef.current = realtime;

  const [broadcast, setBroadcast] = useState<LiveBroadcast | null>(null);
  const [position, setPosition] = useState<LivePosition>(null);
  const [stats, setStats] = useState<LiveBroadcastStats | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<LiveFeedStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [transport, setTransport] = useState<'polling' | 'reverb' | null>(null);

  /** Last appended coordinate, so a stationary athlete doesn't grow the trail. */
  const lastPointRef = useRef<TrailPoint | null>(null);
  /**
   * Only a real `background` stops the feed. `currentState` can be `unknown`
   * before the first transition, and iOS reports a transient `inactive` for the
   * app switcher or an incoming call — gating on `=== 'active'` would leave the
   * feed permanently unstarted in the first case and thrash it in the second.
   */
  const [isForeground, setIsForeground] = useState(AppState.currentState !== 'background');

  // Polling a broadcast the user cannot see is pure battery cost.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      setIsForeground(next !== 'background');
    });
    return () => sub.remove();
  }, []);

  const handleUpdate = useCallback(
    (update: { position: LivePosition; stats: LiveBroadcastStats; broadcast?: LiveBroadcast }) => {
      setStatus('live');
      setError(null);
      setStats(update.stats);
      setPosition(update.position);
      if (update.broadcast) setBroadcast(update.broadcast);

      // `null` position = inside a privacy zone. Skip it entirely: drawing to
      // the previous point would connect across the hidden stretch.
      if (!update.position) return;

      const [lng, lat] = update.position;
      const last = lastPointRef.current;
      // Both transports emit a fresh object every tick even when nothing moved;
      // appending unconditionally grows the trail forever while drawing nothing.
      if (last && last.lng === lng && last.lat === lat) return;

      const point = { lng, lat };
      lastPointRef.current = point;
      setTrail((prev) => [...prev, point]);
    },
    [],
  );

  const handleMessages = useCallback((incoming: LiveMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, []);

  useEffect(() => {
    if (!activityId || !enabled || !isForeground) return;

    // A new broadcast is a new trail — never carry points across athletes.
    lastPointRef.current = null;
    setTrail([]);
    setMessages([]);
    setStatus('connecting');

    const instance = createLiveTransport(realtimeRef.current, {
      activityId,
      withMessages,
      handlers: {
        onUpdate: handleUpdate,
        onMessages: handleMessages,
        onEnded: () => {
          logger.info('live', 'Broadcast ended', { activityId });
          setStatus('ended');
        },
        onError: (err) => {
          // Keep showing the last good frame; a dropped tick is not a dead feed.
          setError(err);
          setStatus((prev) => (prev === 'live' ? 'live' : 'error'));
        },
      },
    });

    setTransport(instance.name);
    instance.start();

    return () => instance.stop();
  }, [
    activityId,
    enabled,
    isForeground,
    driver,
    pollIntervalMs,
    withMessages,
    handleUpdate,
    handleMessages,
  ]);

  return {
    broadcast,
    position,
    stats,
    trail,
    messages,
    status,
    error,
    isPositionHidden: status === 'live' && position === null,
    transport,
  };
}
