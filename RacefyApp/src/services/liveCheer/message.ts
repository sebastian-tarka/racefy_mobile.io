/**
 * Pure helpers over a live message's voice fields — shared by the athlete's
 * playback, the spectator's list and the archive, and small enough to test
 * without a player.
 */
import type { LiveMessage } from '../../types/api';

/** A message carries a recording. Older backends send no `message_type` — that is text. */
export function isVoiceMessage(message: Pick<LiveMessage, 'message_type'>): boolean {
  return message.message_type === 'voice';
}

/** Upper bound for a recorded cheer the server would still accept, used when the config is silent. */
export const DEFAULT_VOICE_MAX_SECONDS = 20;

/** How long after a clip "should" have ended we give up waiting for `didJustFinish`. */
const VOICE_CLIP_MARGIN_MS = 3000;

/**
 * Wait budget for a voice clip. The server measures `audio_duration_ms`; if it
 * could not, fall back to the longest clip it accepts.
 */
export function voiceClipTimeoutMs(durationMs: number | null | undefined): number {
  const known = typeof durationMs === 'number' && durationMs > 0;
  return (known ? durationMs : DEFAULT_VOICE_MAX_SECONDS * 1000) + VOICE_CLIP_MARGIN_MS;
}

/** "12 s" — whole seconds, rounded up so a 0.4 s clip never shows as "0 s". */
export function formatClipSeconds(durationMs: number | null | undefined): string {
  const ms = typeof durationMs === 'number' && durationMs > 0 ? durationMs : 0;
  return `${Math.max(1, Math.ceil(ms / 1000))} s`;
}
