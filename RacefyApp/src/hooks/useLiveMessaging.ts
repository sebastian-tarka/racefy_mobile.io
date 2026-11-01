import { useCallback, useState } from 'react';

import { api } from '../services/api';
import { logger } from '../services/logger';
import { type LiveSendKind, mapLiveSendError } from '../services/liveCheer/sendErrors';
import type { LiveMessage } from '../types/api';
import { getErrorStatus } from '../utils/errors';

export const LIVE_MESSAGE_MAX_LENGTH = 280;

export interface RecordedClip {
  /** Local file uri of the m4a recording. */
  uri: string;
  durationMs: number;
}

interface Result {
  send: (content: string, isPublic: boolean) => Promise<LiveMessage | null>;
  sendVoice: (clip: RecordedClip, isPublic: boolean) => Promise<LiveMessage | null>;
  isSending: boolean;
  /**
   * True once a send was rejected because the athlete has live messages
   * switched off. The broadcast reports `allow_live_comments` up front, so this
   * is the fallback for a backend that does not — and for a preference flipped
   * mid-broadcast. Once known, the composer must disappear rather than keep
   * accepting text that will bounce.
   */
  commentsDisabled: boolean;
  /** Same, for voice only: the athlete takes typed cheers but not recordings. */
  voiceDisabled: boolean;
  /** Last send failure, already translated to a user-facing key. */
  errorKey: string | null;
  clearError: () => void;
}

export function useLiveMessaging(activityId: number | null): Result {
  const [isSending, setIsSending] = useState(false);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const run = useCallback(
    async (kind: LiveSendKind, request: () => Promise<LiveMessage>) => {
      setIsSending(true);
      setErrorKey(null);
      try {
        return await request();
      } catch (err) {
        const failure = mapLiveSendError(err, kind);
        if (failure.disables === 'comments') setCommentsDisabled(true);
        if (failure.disables === 'voice') setVoiceDisabled(true);
        setErrorKey(failure.key);
        logger.warn('live', 'Failed to send live message', {
          activityId,
          kind,
          status: getErrorStatus(err),
        });
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [activityId],
  );

  const send = useCallback(
    async (content: string, isPublic: boolean) => {
      const trimmed = content.trim();
      if (!activityId || !trimmed) return null;
      if (trimmed.length > LIVE_MESSAGE_MAX_LENGTH) {
        setErrorKey('live.messages.tooLong');
        return null;
      }
      return run('text', () =>
        api.sendLiveMessage(activityId, { content: trimmed, public: isPublic }),
      );
    },
    [activityId, run],
  );

  const sendVoice = useCallback(
    async (clip: RecordedClip, isPublic: boolean) => {
      if (!activityId) return null;
      return run('voice', () =>
        api.sendLiveVoiceMessage(activityId, {
          uri: clip.uri,
          durationMs: clip.durationMs,
          public: isPublic,
        }),
      );
    },
    [activityId, run],
  );

  const clearError = useCallback(() => setErrorKey(null), []);

  return { send, sendVoice, isSending, commentsDisabled, voiceDisabled, errorKey, clearError };
}
