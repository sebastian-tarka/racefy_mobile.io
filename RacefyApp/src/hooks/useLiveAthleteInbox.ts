import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import { type LiveTtsFailure, playLiveMessageTts } from '../services/liveTts';
import { useAppConfig } from '../contexts/AppConfigContext';
import type { LiveMessage } from '../types/api';

interface Options {
  /** Only poll while actually broadcasting. */
  enabled: boolean;
  /** From the athlete's `live.tts_incoming` preference. */
  autoPlayTts: boolean;
}

interface Result {
  messages: LiveMessage[];
  /** Most recent message, for a lightweight toast on the recording screen. */
  latest: LiveMessage | null;
  unreadCount: number;
  markAllSeen: () => void;
  /** Set when TTS failed in a way the athlete should know about. */
  ttsFailure: LiveTtsFailure | null;
  clearTtsFailure: () => void;
  speak: (message: LiveMessage) => Promise<void>;
}

const DEFAULT_POLL_MS = 5000;

/**
 * The broadcasting athlete's view of incoming messages.
 *
 * The athlete receives ALL messages (private and public) from the same endpoint
 * spectators use — the scoping happens server-side.
 */
export function useLiveAthleteInbox(
  activityId: number | null,
  { enabled, autoPlayTts }: Options,
): Result {
  const { config } = useAppConfig();
  const pollMs = config?.realtime?.poll_interval_ms ?? DEFAULT_POLL_MS;

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ttsFailure, setTtsFailure] = useState<LiveTtsFailure | null>(null);

  const lastIdRef = useRef(0);
  /**
   * Ids already spoken on this device. `audio_played_at` is the server's record
   * and is authoritative across devices, but it does not update until the
   * server sees the playback — without a local guard the same message would be
   * read again on the very next poll.
   */
  const spokenRef = useRef<Set<number>>(new Set());
  /** Latched once TTS is unavailable for the whole session (tier or quota). */
  const ttsBlockedRef = useRef(false);

  const speak = useCallback(async (message: LiveMessage) => {
    if (spokenRef.current.has(message.id)) return;
    spokenRef.current.add(message.id);

    const result = await playLiveMessageTts(message.id);
    if (!result.ok) {
      setTtsFailure(result.reason);
      // A tier or quota failure will fail identically for every later message,
      // so stop trying rather than burning a request on each new one.
      if (result.reason === 'upgrade_required' || result.reason === 'limit_reached') {
        ttsBlockedRef.current = true;
      }
    }
  }, []);

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

        if (!autoPlayTts || ttsBlockedRef.current) return;

        // Never read a message twice: skip anything the server already recorded
        // as played, and anything this device has spoken.
        const toSpeak = incoming.filter((m) => !m.audio_played_at && !spokenRef.current.has(m.id));

        for (const message of toSpeak) {
          if (cancelled) break;
          await speak(message);
        }
      } catch (error: any) {
        logger.warn('live', 'Athlete inbox poll failed', {
          activityId,
          status: error?.status,
        });
      }
    };

    tick();
    const timer = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activityId, enabled, autoPlayTts, pollMs, speak]);

  const markAllSeen = useCallback(() => setUnreadCount(0), []);
  const clearTtsFailure = useCallback(() => setTtsFailure(null), []);

  return {
    messages,
    latest: messages.length > 0 ? messages[messages.length - 1] : null,
    unreadCount,
    markAllSeen,
    ttsFailure,
    clearTtsFailure,
    speak,
  };
}
