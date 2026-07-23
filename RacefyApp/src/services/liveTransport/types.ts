import type { LiveBroadcast, LiveBroadcastStats, LiveMessage, LivePosition } from '../../types/api';

/** One tick of broadcast state, whichever transport produced it. */
export interface LiveFeedUpdate {
  position: LivePosition;
  stats: LiveBroadcastStats;
  status: string;
  /** Full broadcast record — only the polling transport has it; Echo sends deltas. */
  broadcast?: LiveBroadcast;
}

export interface LiveTransportHandlers {
  onUpdate: (update: LiveFeedUpdate) => void;
  onMessages: (messages: LiveMessage[]) => void;
  /** The broadcast finished, or the viewer may no longer watch it. Not an error. */
  onEnded: () => void;
  onError: (error: Error) => void;
}

/**
 * A transport feeds a spectator screen. The screen must not be able to tell
 * which implementation it got — the driver is server-controlled and can flip
 * between builds.
 */
export interface LiveTransport {
  readonly name: 'polling' | 'reverb';
  start: () => void;
  stop: () => void;
}

export interface LiveTransportOptions {
  activityId: number;
  handlers: LiveTransportHandlers;
  /** Poll cadence for the polling transport; ignored by Echo. */
  pollIntervalMs: number;
  /** Skip message fetching when the screen has no message UI. */
  withMessages?: boolean;
}
