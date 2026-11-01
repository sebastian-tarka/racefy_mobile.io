import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import { type LiveCheerFailure, playLiveCheer } from '../services/liveCheer/playback';
import { isVoiceMessage } from '../services/liveCheer/message';
import { useAppConfig } from '../contexts/AppConfigContext';
import type { LiveMessage } from '../types/api';
import { getErrorStatus } from '../utils/errors';

interface Options {
  /** Only poll while actually broadcasting. */
  enabled: boolean;
  /** From the athlete's `live.tts_incoming` preference — typed cheers read aloud. */
  autoPlayTts: boolean;
  /** From the athlete's `live.voice_incoming` preference — recorded cheers played back. */
  autoPlayVoice: boolean;
}

export interface LiveAthleteInboxState {
  messages: LiveMessage[];
  /** Most recent message, for a lightweight toast on the recording screen. */
  latest: LiveMessage | null;
  unreadCount: number;
  markAllSeen: () => void;
  /** Set when playback failed in a way the athlete should know about. */
  playbackFailure: LiveCheerFailure | null;
  clearPlaybackFailure: () => void;
  /** Replay a message on demand (long-press); ignores the auto-play preferences. */
  replay: (message: LiveMessage) => Promise<void>;
}

const DEFAULT_POLL_MS = 5000;

/**
 * The broadcasting athlete's view of incoming messages.
 *
 * The athlete receives ALL messages (private and public) from the same endpoint
 * spectators use — the scoping happens server-side.
 *
 * Mount this where it lives for the WHOLE recording, not inside a view that
 * comes and goes (the in-app screen lock, pause): a cheer that arrives while
 * the screen is locked is exactly the one the athlete most needs to hear.
 */
export function useLiveAthleteInbox(
  activityId: number | null,
  { enabled, autoPlayTts, autoPlayVoice }: Options,
): LiveAthleteInboxState {
  const { config } = useAppConfig();
  const pollMs = config?.realtime?.poll_interval_ms ?? DEFAULT_POLL_MS;

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [playbackFailure, setPlaybackFailure] = useState<LiveCheerFailure | null>(null);

  const lastIdRef = useRef(0);
  /**
   * Ids already played on this device. `audio_played_at` is the server's record
   * and is authoritative across devices, but it does not update until the
   * server sees the playback — without a local guard the same message would be
   * played again on the very next poll.
   */
  const playedRef = useRef<Set<number>>(new Set());
  /**
   * Latched once TTS is unavailable for the whole session (tier or quota).
   * Voice clips are plain files and are never gated, so they keep playing.
   */
  const ttsBlockedRef = useRef(false);

  const play = useCallback(async (message: LiveMessage) => {
    const result = await playLiveCheer(message);
    if (result.ok) return;
    setPlaybackFailure(result.reason);
    // A tier or quota failure will fail identically for every later message,
    // so stop trying rather than burning a request on each new one.
    if (result.reason === 'upgrade_required' || result.reason === 'limit_reached') {
      ttsBlockedRef.current = true;
    }
  }, []);

  const replay = useCallback(
    async (message: LiveMessage) => {
      playedRef.current.add(message.id);
      await play(message);
    },
    [play],
  );

  useEffect(() => {
    if (!activityId || !enabled) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const incoming = await api.getLiveMessages(activityId, lastIdRef.current || undefined);
        if (cancelled || incoming.length === 0) return;

        lastIdRef.current = Math.max(lastIdRef.current, ...incoming.map((m) => m.id));
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
        setUnreadCount((c) => c + incoming.length);

        // Never play a message twice: skip anything the server already recorded
        // as played, anything this device has played, and whatever kind the
        // athlete switched off.
        const toPlay = incoming.filter((m) => {
          if (m.audio_played_at || playedRef.current.has(m.id)) return false;
          return isVoiceMessage(m) ? autoPlayVoice : autoPlayTts && !ttsBlockedRef.current;
        });

        for (const message of toPlay) {
          if (cancelled) break;
          playedRef.current.add(message.id);
          await play(message);
        }
      } catch (error) {
        logger.warn('live', 'Athlete inbox poll failed', {
          activityId,
          status: getErrorStatus(error),
        });
      }
    };

    tick();
    const timer = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activityId, enabled, autoPlayTts, autoPlayVoice, pollMs, play]);

  const markAllSeen = useCallback(() => setUnreadCount(0), []);
  const clearPlaybackFailure = useCallback(() => setPlaybackFailure(null), []);

  return {
    messages,
    latest: messages.length > 0 ? messages[messages.length - 1] : null,
    unreadCount,
    markAllSeen,
    playbackFailure,
    clearPlaybackFailure,
    replay,
  };
}
