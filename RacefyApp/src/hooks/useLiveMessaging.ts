import { useCallback, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import type { LiveMessage } from '../types/api';

export const LIVE_MESSAGE_MAX_LENGTH = 280;

interface Result {
  send: (content: string, isPublic: boolean) => Promise<LiveMessage | null>;
  isSending: boolean;
  /**
   * True once the athlete has been found to have live messages switched off.
   *
   * This can only ever become true AFTER a rejected send: neither the broadcast
   * payload nor its `user` block exposes `allow_live_comments` (verified against
   * the API), so a spectator has no way to know up front. Once we do know, the
   * composer must disappear rather than keep accepting text that will bounce.
   */
  commentsDisabled: boolean;
  /** Last send failure, already translated to a user-facing key. */
  errorKey: string | null;
  clearError: () => void;
}

export function useLiveMessaging(activityId: number | null): Result {
  const [isSending, setIsSending] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const send = useCallback(
    async (content: string, isPublic: boolean) => {
      const trimmed = content.trim();
      if (!activityId || !trimmed) return null;
      if (trimmed.length > LIVE_MESSAGE_MAX_LENGTH) {
        setErrorKey('live.messages.tooLong');
        return null;
      }

      setIsSending(true);
      setErrorKey(null);
      try {
        return await api.sendLiveMessage(activityId, { content: trimmed, public: isPublic });
      } catch (err: any) {
        // Prefer the machine-readable `error` code where the API sends one;
        // fall back to the HTTP status, which is all older responses carried.
        // Never branch on `message` — it is prose and it is translated.
        if (err?.error === 'live_comments_disabled' || err?.status === 403) {
          setCommentsDisabled(true);
          setErrorKey('live.messages.disabled');
        } else if (err?.status === 404) {
          setErrorKey('live.messages.unavailable');
        } else if (err?.status === 422) {
          setErrorKey('live.messages.tooLong');
        } else if (err?.status === 429) {
          setErrorKey('live.messages.throttled');
        } else {
          setErrorKey('live.messages.sendFailed');
        }
        logger.warn('live', 'Failed to send live message', {
          activityId,
          status: err?.status,
        });
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [activityId],
  );

  const clearError = useCallback(() => setErrorKey(null), []);

  return { send, isSending, commentsDisabled, errorKey, clearError };
}
