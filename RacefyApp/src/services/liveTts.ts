import { api } from './api';
import { logger } from './logger';
import { withAudioFocus } from './audioCoach/audioSession';
import { playBase64Mp3 } from './audio/playBase64Mp3';

/**
 * Why a live message failed to be read aloud. These are NOT interchangeable:
 * `upgrade_required` is a permanent tier limit that warrants an upgrade prompt,
 * while `limit_reached` is a temporary monthly cost cap that will lift on its
 * own — telling the user the wrong one is actively misleading.
 */
export type LiveTtsFailure = 'upgrade_required' | 'limit_reached' | 'not_athlete' | 'failed';

export type LiveTtsResult = { ok: true } | { ok: false; reason: LiveTtsFailure };

/**
 * Fetch and play a live message as speech, for the broadcasting athlete.
 *
 * Playback goes through the audio coach's session setup, which keeps audio
 * alive with the screen locked and DUCKS music rather than stopping it — the
 * athlete is running and cannot look at the screen, so this must work without
 * hijacking whatever they are listening to.
 */
export async function playLiveMessageTts(commentId: number): Promise<LiveTtsResult> {
  try {
    const result = await api.getLiveMessageTts(commentId);

    if (!result?.audio_base64) {
      logger.warn('live', 'Empty TTS audio for live message', { commentId });
      return { ok: false, reason: 'failed' };
    }

    // Focus held only around playback (not the fetch): music ducks/pauses per
    // the user's preference and comes back when the message ends.
    await withAudioFocus(() => playBase64Mp3(result.audio_base64, `live_msg_${commentId}`));
    return { ok: true };
  } catch (error: any) {
    const status = error?.status;
    // 403 = free tier, 402 = over the monthly TTS cost cap, 404 = not the
    // athlete on this broadcast. Each needs its own message.
    const reason: LiveTtsFailure =
      status === 403
        ? 'upgrade_required'
        : status === 402
          ? 'limit_reached'
          : status === 404
            ? 'not_athlete'
            : 'failed';

    logger.warn('live', 'Live message TTS failed', { commentId, status, reason });
    return { ok: false, reason };
  }
}
