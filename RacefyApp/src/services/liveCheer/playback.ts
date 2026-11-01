/**
 * What the broadcasting athlete hears when a spectator cheers.
 *
 * One cheer = one task on the audio coach's serial queue: a short jingle that
 * says "this is a person, not the coach", then the message — synthesised speech
 * for a typed cheer, the spectator's own recording for a voice one. Jingle and
 * message run inside a single `withAudioFocus`, so music ducks once and comes
 * back once, and a km-split announcement that arrives in between waits its turn
 * instead of talking over the cheer.
 *
 * Kept free of React: the queue outlives any screen, and the inbox hook that
 * feeds it is meant to keep running with the recording screen locked.
 */
import { api } from '../api';
import { logger } from '../logger';
import { enqueueAudioTask } from '../audioCoach/tts';
import { withAudioFocus } from '../audioCoach/audioSession';
import { loadAudio, playAudioSource } from '../audio/playAudioSource';
import { playBase64Mp3 } from '../audio/playBase64Mp3';
import type { LiveMessage } from '../../types/api';
import { getErrorStatus } from '../../utils/errors';
import { isVoiceMessage, voiceClipTimeoutMs } from './message';

/**
 * Why a cheer could not be played. These are NOT interchangeable:
 * `upgrade_required` is a permanent tier limit that warrants an upgrade prompt,
 * while `limit_reached` is a temporary monthly cost cap that lifts on its own
 * — telling the athlete the wrong one is actively misleading. Both are TTS-only;
 * a voice clip is a file and has no tier.
 */
export type LiveCheerFailure =
  | 'upgrade_required'
  | 'limit_reached'
  | 'not_athlete'
  | 'expired'
  | 'failed';

type LiveCheerResult = { ok: true } | { ok: false; reason: LiveCheerFailure };

// Both ~0.5 s (see assets/audio); the timeout only guards a lost onFinish.
const JINGLES = {
  voice: require('../../../assets/audio/cheer_voice.wav'),
  text: require('../../../assets/audio/cheer_text.wav'),
};
const JINGLE_TIMEOUT_MS = 2000;

/**
 * Queue a cheer and resolve once it has been played (or failed). Resolution
 * waits for everything already in the queue, so a caller that awaits this in a
 * loop plays cheers strictly in arrival order.
 */
export function playLiveCheer(message: LiveMessage): Promise<LiveCheerResult> {
  return new Promise((resolve) => {
    enqueueAudioTask(async () => {
      resolve(
        isVoiceMessage(message) ? await playVoiceCheer(message) : await playTextCheer(message),
      );
    });
  });
}

/**
 * Typed cheer: jingle, then the server's TTS rendering of it.
 *
 * The TTS call is made before taking focus — it can take seconds, and ducked
 * music with nothing playing reads as a glitch.
 */
async function playTextCheer(message: LiveMessage): Promise<LiveCheerResult> {
  try {
    const result = await api.getLiveMessageTts(message.id);
    if (!result?.audio_base64) {
      logger.warn('live', 'Empty TTS audio for live message', { commentId: message.id });
      return { ok: false, reason: 'failed' };
    }

    await withAudioFocus(async () => {
      await playJingle('text');
      await playBase64Mp3(result.audio_base64, `live_msg_${message.id}`);
    });
    return { ok: true };
  } catch (error) {
    const status = getErrorStatus(error);
    // 403 = free tier, 402 = over the monthly TTS cost cap, 404 = not the
    // athlete on this broadcast. Each needs its own message.
    const reason: LiveCheerFailure =
      status === 403
        ? 'upgrade_required'
        : status === 402
          ? 'limit_reached'
          : status === 404
            ? 'not_athlete'
            : 'failed';
    logger.warn('live', 'Live message TTS failed', { commentId: message.id, status, reason });
    return { ok: false, reason };
  }
}

/**
 * Voice cheer: jingle, then the spectator's clip, then tell the server it was
 * heard so no other device of the athlete's plays it again.
 *
 * The clip is STREAMED from its signed url rather than downloaded first: the
 * url needs no auth header, so the player can fetch it directly, and the files
 * are small (≤ 1 MB, ≤ 20 s) — a separate download step would only add a
 * second place for the request to fail. It is loaded (not started) before the
 * jingle so the network round-trip is paid up front and the clip follows the
 * jingle without a hole.
 */
async function playVoiceCheer(message: LiveMessage): Promise<LiveCheerResult> {
  if (!message.audio_url) {
    // Purged by retention, or the upload never produced a file. Nothing to hear.
    return { ok: false, reason: 'expired' };
  }

  try {
    const clip = await loadAudio(
      { uri: message.audio_url },
      { timeoutMs: voiceClipTimeoutMs(message.audio_duration_ms) },
    );
    try {
      await withAudioFocus(async () => {
        await playJingle('voice');
        await clip.play();
      });
    } finally {
      await clip.unload();
    }
  } catch (error) {
    logger.warn('live', 'Voice cheer playback failed', {
      commentId: message.id,
      status: getErrorStatus(error),
    });
    return { ok: false, reason: 'failed' };
  }

  // Best effort: a lost stamp means at worst one replay on another device.
  api.markLiveMessagePlayed(message.id).catch((error) => {
    logger.warn('live', 'Failed to mark voice cheer as played', {
      commentId: message.id,
      status: getErrorStatus(error),
    });
  });
  return { ok: true };
}

/** Never lets a missing earcon take the message down with it. */
async function playJingle(kind: keyof typeof JINGLES): Promise<void> {
  try {
    await playAudioSource(JINGLES[kind], { timeoutMs: JINGLE_TIMEOUT_MS });
  } catch (error) {
    logger.warn('live', 'Cheer jingle failed', { kind, error });
  }
}
