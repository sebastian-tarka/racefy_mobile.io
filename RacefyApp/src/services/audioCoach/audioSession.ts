/**
 * Shared audio-session setup for the audio coach.
 *
 * Extracted from tts.ts so the headless background location task can configure
 * the session WITHOUT importing the whole TTS/synthesis module graph. On iOS an
 * inactive audio session silences Speech.speak in the background even with
 * UIBackgroundModes:["audio"] — this must run before every background
 * announcement.
 *
 * Two things this module owns beyond "make sound come out":
 *
 * 1. How our announcements interact with whatever the athlete is listening to
 *    (Spotify, podcasts): `duck` quiets the other app while we speak, `pause`
 *    stops it outright for the duration, `mix` leaves it alone.
 * 2. Android audio focus for OFFLINE speech. `expo-av` requests audio focus
 *    when a Sound plays, but `expo-speech` goes through the platform TTS engine
 *    and does NOT — so on Android an offline announcement is simply drowned out
 *    by music. `withAudioFocus` works around that by holding a silent looping
 *    track (which does request focus) for the duration of the utterance.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { logger } from '../logger';

/** How announcements treat audio from other apps. */
export type AudioFocusMode = 'duck' | 'pause' | 'mix';

export interface AudioFocusPrefs {
  /** Interaction with other apps' audio while an announcement plays. */
  mode: AudioFocusMode;
  /**
   * Playback volume for AI (MP3) announcements, 0..1. The platform caps this at
   * 1.0 — announcements cannot be amplified above the device volume, so making
   * them stand out is the job of `mode`, not of this value.
   */
  volume: number;
}

export const DEFAULT_AUDIO_FOCUS_PREFS: AudioFocusPrefs = {
  mode: 'duck',
  volume: 1.0,
};

const STORAGE_KEY = '@racefy:audio:focus';

let prefs: AudioFocusPrefs = DEFAULT_AUDIO_FOCUS_PREFS;
let prefsLoaded = false;
/** Audio mode currently applied to the native session, or null if none/stale. */
let appliedMode: AudioFocusMode | null = null;

function sanitize(raw: Partial<AudioFocusPrefs> | null | undefined): AudioFocusPrefs {
  const mode = raw?.mode;
  const volume = raw?.volume;
  return {
    mode:
      mode === 'duck' || mode === 'pause' || mode === 'mix' ? mode : DEFAULT_AUDIO_FOCUS_PREFS.mode,
    volume:
      typeof volume === 'number' && volume >= 0 && volume <= 1
        ? volume
        : DEFAULT_AUDIO_FOCUS_PREFS.volume,
  };
}

/**
 * Load persisted preferences. Safe to call repeatedly — reads storage once per
 * JS context, which matters because the headless background task starts with a
 * fresh module registry and must hydrate before its first announcement.
 */
export async function loadAudioFocusPrefs(): Promise<AudioFocusPrefs> {
  if (prefsLoaded) return prefs;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    prefs = sanitize(raw ? JSON.parse(raw) : null);
  } catch (err) {
    logger.warn('audioCoach', 'Failed to load audio focus prefs, using defaults', { error: err });
    prefs = DEFAULT_AUDIO_FOCUS_PREFS;
  }
  prefsLoaded = true;
  return prefs;
}

/** Cached preferences, without touching storage. */
export function getAudioFocusPrefs(): AudioFocusPrefs {
  return prefs;
}

/** Persist a change and re-apply the native audio session. */
export async function setAudioFocusPrefs(partial: Partial<AudioFocusPrefs>): Promise<void> {
  prefs = sanitize({ ...prefs, ...partial });
  prefsLoaded = true;
  // Force ensureAudioMode to reconfigure rather than short-circuit.
  appliedMode = null;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    logger.warn('audioCoach', 'Failed to persist audio focus prefs', { error: err });
  }
  await ensureAudioMode();
}

/** Apply a concrete mode to the native session, bypassing the appliedMode guard. */
async function applySessionMode(mode: AudioFocusMode): Promise<void> {
  // `pause` = take exclusive focus so the other app stops entirely; `duck` =
  // the other app keeps playing, quieter; `mix` = untouched. Android's enum
  // has no mix constant — `mix` is expressed by never holding focus for speech
  // (see withAudioFocus) rather than by the mode constant.
  try {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS:
        mode === 'pause'
          ? InterruptionModeIOS.DoNotMix
          : mode === 'duck'
            ? InterruptionModeIOS.DuckOthers
            : InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid:
        mode === 'pause' ? InterruptionModeAndroid.DoNotMix : InterruptionModeAndroid.DuckOthers,
      // Whether OUR audio ducks when someone else interrupts us (a call, a
      // navigation prompt). Keep it on — an announcement is never worth
      // fighting an interruption over.
      shouldDuckAndroid: true,
    });
    appliedMode = mode;
    logger.debug('audioCoach', 'Audio mode configured', { mode });
  } catch (err) {
    logger.warn('audioCoach', 'Failed to set audio mode', { error: err });
  }
}

/**
 * Ensure the audio session is configured for background playback (locked
 * screen, silent mode) and for the selected interaction with other apps.
 *
 * Reconfigures only when the mode changed, so the common per-announcement call
 * is a no-op.
 */
export async function ensureAudioMode(): Promise<void> {
  await loadAudioFocusPrefs();
  if (appliedMode === prefs.mode) return;
  await applySessionMode(prefs.mode);
}

// ---------------------------------------------------------------------------
// Audio focus holder
//
// A silent looping expo-av Sound played for the duration of an announcement.
// It does double duty:
// - Android: expo-av requests audio focus when a Sound plays (TRANSIENT_MAY_DUCK
//   for duck, GAIN for pause) and abandons it when the last player stops —
//   that request is what makes the music app duck/pause, and expo-speech never
//   issues one itself.
// - iOS: playing a Sound is the only thing that ACTIVATES the expo-av audio
//   session, and DuckOthers/DoNotMix only take effect while the session is
//   active — pure TTS would otherwise play into an inactive session and duck
//   nothing.
// ---------------------------------------------------------------------------

/** 0.5 s of silent 8 kHz mono PCM — small enough to regenerate on demand. */
const SILENCE_SECONDS = 0.5;
const SILENCE_SAMPLE_RATE = 8000;

function buildSilentWav(): Uint8Array {
  const numSamples = SILENCE_SAMPLE_RATE * SILENCE_SECONDS;
  const dataBytes = numSamples * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SILENCE_SAMPLE_RATE, true);
  view.setUint32(28, SILENCE_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  // Sample data is left as zeros — that IS the silence.

  return new Uint8Array(buffer);
}

function silentTrackUri(): string {
  const file = new File(Paths.cache, 'racefy_audio_focus_silence.wav');
  if (!file.exists) {
    file.write(buildSilentWav());
  }
  return file.uri;
}

let focusSound: Audio.Sound | null = null;
let focusHolders = 0;

async function acquireFocus(): Promise<void> {
  focusHolders += 1;
  if (focusHolders > 1 || focusSound) return;
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: silentTrackUri() },
      { shouldPlay: true, isLooping: true, volume: 0 },
    );
    focusSound = sound;
  } catch (err) {
    // Losing the focus holder only means the announcement is quieter than
    // intended — never a reason to skip speaking.
    logger.warn('audioCoach', 'Failed to acquire audio focus', { error: err });
  }
}

async function releaseFocus(): Promise<void> {
  focusHolders = Math.max(0, focusHolders - 1);
  if (focusHolders > 0) return;

  if (focusSound) {
    const sound = focusSound;
    focusSound = null;
    // On Android, abandoning focus (which expo-av does when its last player
    // stops) is what lets the music app un-duck / resume.
    await sound.stopAsync().catch(() => {});
    await sound.unloadAsync().catch(() => {});
  }

  // iOS never deactivates the expo-av audio session (setActive:NO is disabled
  // in expo-av, see expo/expo#15873), so with DuckOthers the music would stay
  // quiet FOREVER after the first announcement. Swapping the category options
  // to MixWithOthers takes effect immediately and lifts the duck; the next
  // announcement's ensureAudioMode() switches it back.
  if (Platform.OS === 'ios') {
    await applySessionMode('mix');
    // A holder that raced in while we were reverting still expects duck/pause.
    if (focusHolders > 0) await ensureAudioMode();
  }
}

/**
 * Run `fn` while holding audio focus, so other apps duck or pause around it —
 * and un-duck / hand focus back the moment the last concurrent holder is done.
 *
 * `mix` deliberately skips all of it and leaves other apps at full volume.
 * Nested calls share one holder, so a milestone announcement chained onto a
 * split announcement doesn't let music jump back up in between.
 */
export async function withAudioFocus<T>(fn: () => Promise<T>): Promise<T> {
  await ensureAudioMode();
  if (prefs.mode === 'mix') {
    return fn();
  }
  await acquireFocus();
  try {
    return await fn();
  } finally {
    await releaseFocus();
  }
}

/** Some Android TTS engines never fire onDone; don't hold focus forever if so. */
const SPEECH_SAFETY_TIMEOUT_MS = 15_000;

/**
 * Speak via platform TTS while other apps are ducked/paused, resolving when the
 * utterance finishes.
 *
 * Every offline announcement in the app goes through here — the foreground
 * audio coach, the headless background task and turn-by-turn navigation — so
 * that audio focus is held for exactly as long as we are actually speaking.
 * Never rejects: a failed announcement must not break the caller's flow.
 */
export function speakDucked(text: string, options: Speech.SpeechOptions = {}): Promise<void> {
  return withAudioFocus(
    () =>
      new Promise<void>((resolve) => {
        const safetyTimeout = setTimeout(() => {
          logger.warn('audioCoach', 'speakDucked: safety timeout, resolving');
          resolve();
        }, SPEECH_SAFETY_TIMEOUT_MS);

        const finish = (log?: () => void) => {
          clearTimeout(safetyTimeout);
          log?.();
          resolve();
        };

        Speech.speak(text, {
          // Speak through OUR session (configured for ducking/pausing others
          // and for background playback) instead of a private one iOS would
          // otherwise create for speech.
          useApplicationAudioSession: true,
          ...options,
          onDone: () => finish(),
          onStopped: () => finish(),
          onError: (err) =>
            finish(() => logger.error('audioCoach', 'Speech failed', { error: err })),
        });
      }),
  );
}
