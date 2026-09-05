import * as Speech from 'expo-speech';
import { logger } from '../logger';
import { synthesize } from './api';
import { ensureAudioMode, speakDucked, withAudioFocus } from './audioSession';
import { playBase64Mp3 } from '../audio/playBase64Mp3';
import type { AudioCoachSettings } from '../../types/audioCoach';

const SYNTH_TIMEOUT_MS = 8000;

/** Simple queue to prevent overlapping announcements */
let isSpeaking = false;
const queue: (() => Promise<void>)[] = [];

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
 * Run an arbitrary audio task (an earcon, a pre-recorded clip) through the
 * same serial queue as speech, so it never overlaps an announcement and plays
 * in the order it was requested — a workout tone followed by its sentence.
 */
export function enqueueAudioTask(task: () => Promise<void>): void {
  enqueue(task);
}

/** Whether an announcement is playing or waiting. */
export function isSpeechQueueBusy(): boolean {
  return isSpeaking || queue.length > 0;
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
  logger.debug('audioCoach', 'speakOffline: starting', {
    text: text.substring(0, 80),
    language: settings.language,
  });
  // speakDucked holds audio focus for the utterance (platform TTS does not
  // request it on Android) and never rejects, so the queue keeps draining.
  await speakDucked(text, {
    language: SPEECH_LANG_MAP[settings.language] || 'en-US',
    rate: settings.speechRate,
    pitch: settings.speechPitch,
  });
  logger.debug('audioCoach', 'speakOffline: done');
}

/**
 * Attempt AI TTS via backend, with timeout
 */
async function speakAi(text: string, settings: AudioCoachSettings): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);

  try {
    await ensureAudioMode();
    const result = await synthesize(text, settings.aiVoice, settings.language, controller.signal);
    clearTimeout(timeout);

    if (!result.audio_base64) {
      logger.warn('audioCoach', 'Empty audio response from AI TTS');
      return false;
    }

    // Focus is held only around playback, not the synth network call — the
    // music must not dip while we wait for the backend.
    await withAudioFocus(() => playBase64Mp3(result.audio_base64, `audiocoach_${Date.now()}`));

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
