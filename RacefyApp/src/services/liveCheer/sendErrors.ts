/**
 * Turns a failed live-message send into what the spectator should read.
 *
 * Prefers the machine-readable `error` code where the API sends one and falls
 * back to the HTTP status, which is all older responses carried. Never
 * branches on `message` — it is prose and it is translated.
 */
import { getErrorStatus, isApiError } from '../../utils/errors';

export type LiveSendKind = 'text' | 'voice';

interface LiveSendFailure {
  /** i18n key for the user-facing line. */
  key: string;
  /**
   * What the athlete has switched off, when the rejection says so. The
   * composer withdraws that input for the rest of the session rather than
   * keep accepting something that will bounce.
   */
  disables?: 'comments' | 'voice';
}

function errorCode(err: unknown): string | undefined {
  return isApiError(err) && typeof err.error === 'string' ? err.error : undefined;
}

export function mapLiveSendError(err: unknown, kind: LiveSendKind): LiveSendFailure {
  const code = errorCode(err);
  const status = getErrorStatus(err);

  if (code === 'live_voice_disabled') {
    return { key: 'live.voice.disabled', disables: 'voice' };
  }
  if (code === 'live_comments_disabled' || status === 403) {
    return { key: 'live.messages.disabled', disables: 'comments' };
  }
  if (status === 404) return { key: 'live.messages.unavailable' };
  if (status === 429) return { key: 'live.messages.throttled' };

  if (kind === 'voice') {
    if (status === 422) {
      if (code === 'voice_too_long') return { key: 'live.voice.tooLong' };
      if (code === 'voice_rejected') return { key: 'live.voice.rejected' };
      // `voice_unreadable` and plain validation errors: the file, not the person.
      return { key: 'live.voice.unreadable' };
    }
    return { key: 'live.voice.sendFailed' };
  }

  if (status === 422) return { key: 'live.messages.tooLong' };
  return { key: 'live.messages.sendFailed' };
}
