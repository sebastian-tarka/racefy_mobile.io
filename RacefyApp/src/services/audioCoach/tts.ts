import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import { logger } from '../logger';
import { synthesize } from './api';
import type { AudioCoachSettings } from '../../types/audioCoach';

const SYNTH_TIMEOUT_MS = 8000;

/** Ensure audio session is configured for background playback (locked screen, silent mode) */
let audioModeConfigured = false;
async function ensureAudioMode() {
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

/** Simple queue to prevent overlapping announcements */
let isSpeaking = false;
const queue: Array<() => Promise<void>> = [];

async function processQueue() {
  if (isSpeaking || queue.length === 0) return;
  isSpeaking = true;
  logger.debug('audioCoach', 'processQueue: starting task', { queueLength: queue.length });

  const task = queue.shift()!;
  try {
    await task();
  } catch (err) {
    logger.error('audioCoach', 'Queue task failed', { error: err });
  } finally {
    isSpeaking = false;
    logger.debug('audioCoach', 'processQueue: task done');
    processQueue();
  }
}

function enqueue(task: () => Promise<void>) {
  queue.push(task);
  logger.debug('audioCoach', 'enqueue: added task', { queueLength: queue.length, isSpeaking });
  processQueue();
}

/**
 * Language code mapping for expo-speech
 */
const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
};

/**
 * Speak text using offline expo-speech as fallback
 */
async function speakOffline(text: string, settings: AudioCoachSettings): Promise<void> {
  await ensureAudioMode();
  logger.debug('audioCoach', 'speakOffline: starting', {
    text: text.substring(0, 80),
    language: settings.language,
  });
  return new Promise((resolve) => {
    // Safety timeout — some Android TTS engines never fire onDone
    const safetyTimeout = setTimeout(() => {
      logger.warn('audioCoach', 'speakOffline: safety timeout (15s), resolving');
      resolve();
    }, 15_000);

    Speech.speak(text, {
      language: SPEECH_LANG_MAP[settings.language] || 'en-US',
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      onDone: () => {
        clearTimeout(safetyTimeout);
        logger.debug('audioCoach', 'speakOffline: done');
        resolve();
      },
      onError: (err) => {
        clearTimeout(safetyTimeout);
        logger.error('audioCoach', 'Offline speech failed', { error: err });
        resolve(); // resolve instead of reject to not block queue
      },
    });
  });
}

/**
 * Attempt AI TTS via backend, with timeout
 */
async function speakAi(text: string, settings: AudioCoachSettings): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);

  try {
    await ensureAudioMode();
    const result = await synthesize(text, settings.aiVoice, settings.language);
    clearTimeout(timeout);

    if (!result.audio_base64) {
      logger.warn('audioCoach', 'Empty audio response from AI TTS');
      return false;
    }

    // Decode base64 to bytes and write to temp file
    const tempFile = new File(Paths.cache, `audiocoach_${Date.now()}.mp3`);
    const binaryString = atob(result.audio_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    tempFile.write(bytes);

    // Play the audio file
    const { sound } = await Audio.Sound.createAsync(
      { uri: tempFile.uri },
      { shouldPlay: true },
    );

    // Wait for playback to finish
    await new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          resolve();
        }
      });
    });

    // Cleanup
    await sound.unloadAsync();
    tempFile.delete();

    return true;
  } catch (error: any) {
    clearTimeout(timeout);

    const status = error?.status;
    console.warn('🔊 AI TTS FAILED', { status, message: error?.message, error: String(error) });
    if (status === 403 || status === 402 || status === 429 || status === 502) {
      logger.warn('audioCoach', `AI TTS returned ${status}, falling back to offline`, {
        status,
      });
    } else {
      logger.warn('audioCoach', 'AI TTS failed, falling back to offline', {
        error: error?.message || String(error),
      });
    }
    return false;
  }
}

/**
 * Main entry point: speak announcement text.
 * Uses AI TTS if enabled and online, falls back to expo-speech.
 */
export function speakText(
  text: string,
  settings: AudioCoachSettings,
  userTier: 'free' | 'plus' | 'pro',
  isOnline: boolean,
): void {
  enqueue(async () => {
    logger.info('audioCoach', 'Speaking announcement', {
      textLength: text.length,
      useAi: settings.useAiVoice,
      tier: userTier,
      isOnline,
    });

    // Only use AI voice for Plus/Pro tiers, when enabled and online
    const shouldUseAi = settings.useAiVoice && userTier !== 'free' && isOnline;

    if (shouldUseAi) {
      const success = await speakAi(text, settings);
      if (success) return;
      // Fall through to offline on failure
    }

    // Fallback: offline TTS
    try {
      await speakOffline(text, settings);
    } catch {
      logger.error('audioCoach', 'Both AI and offline TTS failed');
    }
  });
}

/**
 * Stop any current speech and clear the queue
 */
export function stopSpeaking(): void {
  queue.length = 0;
  Speech.stop();
}
