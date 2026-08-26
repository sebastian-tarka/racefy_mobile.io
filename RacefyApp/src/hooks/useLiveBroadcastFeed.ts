import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { useAppConfig } from '../contexts/AppConfigContext';
import { createLiveTransport } from '../services/liveTransport';
import { logger } from '../services/logger';
import type {
  LiveBroadcast,
  LiveBroadcastStats,
  LiveMessage,
  LivePosition,
  LiveTrack,
} from '../types/api';

/** A point on the trail, in the [lng, lat] order the API uses. */
export interface TrailPoint {
  lng: number;
  lat: number;
  /**
   * First point after a break in the line — a stretch hidden by a privacy zone.
   * The map renders each run of points as its own segment, so the line is never
   * drawn straight across the hidden part.
   */
  segmentBreak?: boolean;
}

/**
 * Flattens the server's privacy-filtered `MultiLineString` into the trail shape,
 * marking each segment boundary so the map keeps the pieces apart.
 *
 * Defensive about the payload on purpose: this is the one place a malformed
 * coordinate would reach the map, where `[undefined, undefined]` renders as a
 * line to null island rather than as an error.
 */
export function trackToTrail(track: LiveTrack | null | undefined): TrailPoint[] {
  if (!track?.coordinates?.length) return [];

  const points: TrailPoint[] = [];

  for (const segment of track.coordinates) {
    if (!Array.isArray(segment)) continue;
    let isSegmentStart = true;

    for (const pair of segment) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const [lng, lat] = pair;
      if (typeof lng !== 'number' || typeof lat !== 'number') continue;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

      // The very first point of the whole trail starts no segment: a break
      // there would only tell the map to split off an empty piece.
      points.push(
        isSegmentStart && points.length > 0 ? { lng, lat, segmentBreak: true } : { lng, lat },
      );
      isSegmentStart = false;
    }
  }

  return points;
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
   * The route drawn so far: the athlete's already-covered track, seeded once
   * from `snapshot.track`, then extended with positions that arrive live.
   *
   * The seed is what stops a spectator joining an hour into a run from staring
   * at an empty map. It is filtered server-side, so privacy zones stay removed —
   * back-filling from raw points would resurrect exactly what they hide.
   *
   * An API without `?include=track` support simply sends nothing here and the
   * trail starts empty, which is the old behaviour.
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
   * The seed is applied once per broadcast. A later tick without a track must
   * never clear the trail — by then it also holds live points the server's
   * snapshot knows nothing about.
   */
  const seededRef = useRef(false);
  /**
   * Set while the athlete's position is withheld, so the point that ends the
   * hidden stretch starts a new segment instead of closing a straight line
   * across it — the same rule the server applies to the seeded track.
   */
  const pendingBreakRef = useRef(false);
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
    (update: {
      position: LivePosition;
      stats: LiveBroadcastStats;
      broadcast?: LiveBroadcast;
      track?: LiveTrack | null;
    }) => {
      setStatus('live');
      setError(null);
      setStats(update.stats);
      setPosition(update.position);
      if (update.broadcast) setBroadcast(update.broadcast);

      // Seed before appending, so the live point lands after the history rather
      // than being swallowed when the seed replaces the array.
      if (!seededRef.current && update.track !== undefined) {
        seededRef.current = true;
        const seeded = trackToTrail(update.track);
        if (seeded.length > 0) {
          // Seeding the dedupe baseline too: the track already ends at the
          // athlete's current position, which would otherwise be appended twice.
          lastPointRef.current = seeded[seeded.length - 1];
          setTrail(seeded);
        }
      }

      // `null` position = inside a privacy zone. Skip it entirely: drawing to
      // the previous point would connect across the hidden stretch.
      if (!update.position) {
        pendingBreakRef.current = lastPointRef.current !== null;
        return;
      }

      const [lng, lat] = update.position;
      const last = lastPointRef.current;
      // Both transports emit a fresh object every tick even when nothing moved;
      // appending unconditionally grows the trail forever while drawing nothing.
      if (last && last.lng === lng && last.lat === lat) return;

      const point: TrailPoint = pendingBreakRef.current
        ? { lng, lat, segmentBreak: true }
        : { lng, lat };
      pendingBreakRef.current = false;
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
    seededRef.current = false;
    pendingBreakRef.current = false;
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
