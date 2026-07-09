/**
 * Shared audio-session setup for the audio coach.
 *
 * Extracted from tts.ts so the headless background location task can configure
 * the session WITHOUT importing the whole TTS/synthesis module graph. On iOS an
 * inactive audio session silences Speech.speak in the background even with
 * UIBackgroundModes:["audio"] — this must run before every background
 * announcement. The once-guard lives here so foreground and background don't
 * fight over configuration.
 */

import { Audio } from 'expo-av';
import { logger } from '../logger';

let audioModeConfigured = false;

/** Ensure audio session is configured for background playback (locked screen, silent mode). */
export async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    audioModeConfigured = true;
  } catch (err) {
    logger.warn('audioCoach', 'Failed to set audio mode', { error: err });
  }
}
