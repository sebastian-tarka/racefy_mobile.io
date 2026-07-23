import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import { getAudioFocusPrefs } from '../audioCoach/audioSession';

/**
 * Decode a base64 MP3 to a temp file, play it to completion, then clean up.
 *
 * Shared by the audio coach and by live-message TTS: both receive
 * `audio_base64` from the backend and need identical playback semantics, and
 * two copies of this would drift.
 *
 * Callers must configure the audio session first (see `ensureAudioMode`) —
 * that is deliberately not done here, because the background location task
 * configures the session without importing this module.
 *
 * @param base64 - Raw base64 MP3 payload.
 * @param fileTag - Distinguishes temp files between concurrent callers.
 * @param volume - 0..1; defaults to the user's announcement volume preference.
 */
export async function playBase64Mp3(
  base64: string,
  fileTag: string,
  volume?: number,
): Promise<void> {
  const tempFile = new File(Paths.cache, `${fileTag}.mp3`);

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  tempFile.write(bytes);

  const { sound } = await Audio.Sound.createAsync(
    { uri: tempFile.uri },
    { shouldPlay: true, volume: volume ?? getAudioFocusPrefs().volume },
  );
  try {
    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) resolve();
      });
    });
  } finally {
    // Runs even if playback rejects, so a failure cannot leak the sound handle
    // or leave the file behind in the cache.
    await sound.unloadAsync().catch(() => {});
    try {
      tempFile.delete();
    } catch {
      // A stale temp file is harmless; the cache directory is disposable.
    }
  }
}
