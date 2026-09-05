/**
 * Turns workout engine events into what the athlete actually hears and feels.
 *
 * Design rules (see .notes/KONFIGURATOR_TRENINGU_PLAN.md, section 2.3):
 * - earcons carry TIMING, speech carries CONTENT — a countdown is beeps only;
 * - boundaries use the OFFLINE voice: the AI voice can take up to 8 s to
 *   synthesise, which is fine for "goal reached" but useless for "go";
 * - every audible cue has a haptic twin — a phone in a pocket with no
 *   headphones still has to communicate;
 * - a goal/complete cue wins over whatever the km-split coach was saying.
 *
 * Runs in both the React foreground and the headless background task, so no
 * hooks and no i18next here — language and units come in via the context.
 */

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { logger } from '../logger';
import { getAudioFocusPrefs, speakDucked, withAudioFocus } from '../audioCoach/audioSession';
import { enqueueAudioTask, speakText, stopSpeaking } from '../audioCoach/tts';
import { isGlobalHapticsEnabled } from '../../hooks/useHaptics';
import type { AudioCoachSettings } from '../../types/audioCoach';
import type { WorkoutCuePrefs, WorkoutGoal } from '../../types/workout';
import { markWorkoutCue } from './audioArbiter';
import type { WorkoutEngineEvent } from './engine';
import {
  buildApproachText,
  buildGoalReachedText,
  buildHalfwayText,
  buildSegmentStartText,
  buildWorkoutCompleteText,
  type SpokenUnits,
} from './templates';

export type CueSound = 'beep' | 'go' | 'work' | 'recovery' | 'goal';

// Short synthetic tones (see assets/audio): mid-high, no bass, 0.1–0.4 s —
// audible on a phone speaker, short enough not to wear out their welcome.
const SOUNDS: Record<CueSound, number> = {
  beep: require('../../../assets/audio/beep.wav'),
  go: require('../../../assets/audio/go.wav'),
  work: require('../../../assets/audio/work.wav'),
  recovery: require('../../../assets/audio/recovery.wav'),
  goal: require('../../../assets/audio/goal.wav'),
};

/** Longest of the clips is ~0.4 s; never wait longer than this for onFinish. */
const CUE_SAFETY_TIMEOUT_MS = 2000;

/**
 * Play one earcon while holding audio focus (music ducks per the athlete's
 * preference). Resolves when playback ends. Never rejects.
 */
export async function playCue(sound: CueSound): Promise<void> {
  try {
    await withAudioFocus(async () => {
      const { sound: player } = await Audio.Sound.createAsync(SOUNDS[sound], {
        shouldPlay: true,
        volume: getAudioFocusPrefs().volume,
      });
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, CUE_SAFETY_TIMEOUT_MS);
          player.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded || status.didJustFinish) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
      } finally {
        await player.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    logger.warn('audioCoach', 'Workout cue failed', { sound, error: err });
  }
}

type HapticKind = 'light' | 'medium' | 'success';

function haptic(kind: HapticKind): void {
  if (!isGlobalHapticsEnabled()) return;
  try {
    if (kind === 'success') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(
        kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      );
    }
  } catch {
    // Haptics are best-effort (headless task, emulator).
  }
}

export interface WorkoutCueContext {
  prefs: WorkoutCuePrefs;
  /** Voice, rate, pitch and language follow the audio coach settings — one voice for the whole run. */
  coachSettings: AudioCoachSettings;
  tier: 'free' | 'plus' | 'pro';
  isOnline: boolean;
  units: SpokenUnits;
  /** Needed to phrase "goal reached"; undefined for interval sessions. */
  goal?: WorkoutGoal;
}

/** Spoken through the offline engine — for cues where a few seconds of latency would be wrong. */
function speakNow(text: string, ctx: WorkoutCueContext): void {
  markWorkoutCue();
  enqueueAudioTask(() =>
    speakDucked(text, {
      language: SPEECH_LANG[ctx.coachSettings.language] ?? 'en-US',
      rate: ctx.coachSettings.speechRate,
      pitch: ctx.coachSettings.speechPitch,
    }),
  );
}

/** Spoken through the full coach path — AI voice when configured, offline fallback. */
function speakRich(text: string, ctx: WorkoutCueContext): void {
  markWorkoutCue();
  speakText(text, ctx.coachSettings, ctx.tier, ctx.isOnline);
}

const SPEECH_LANG: Record<string, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
};

/**
 * Announce a batch of events in order. Idempotency is the engine's job; this
 * function assumes every event it receives is new.
 */
export function handleWorkoutEvents(events: WorkoutEngineEvent[], ctx: WorkoutCueContext): void {
  const { prefs, coachSettings, units } = ctx;
  const lang = coachSettings.language;

  for (const event of events) {
    switch (event.type) {
      case 'countdown': {
        if (!prefs.countdown) break;
        // Timing-critical: straight to the speaker, never behind a queued sentence.
        if (prefs.tone) void playCue('beep');
        if (prefs.haptics) haptic('light');
        break;
      }

      case 'approach': {
        if (prefs.voice)
          speakNow(buildApproachText(event.metersLeft, event.next, lang, units), ctx);
        if (prefs.haptics) haptic('light');
        break;
      }

      case 'segment_start': {
        // A boundary outranks a km split that may still be queued.
        stopSpeaking();
        const tone: CueSound = event.segment.kind === 'work' ? 'work' : 'recovery';
        if (prefs.tone) enqueueAudioTask(() => playCue(tone));
        if (prefs.haptics) haptic('medium');
        if (prefs.voice) speakNow(buildSegmentStartText(event.segment, lang, units), ctx);
        break;
      }

      case 'halfway': {
        if (!prefs.halfway) break;
        if (prefs.haptics) haptic('medium');
        if (prefs.voice) speakRich(buildHalfwayText(event.remaining, lang, units), ctx);
        break;
      }

      case 'goal_reached': {
        stopSpeaking();
        if (prefs.tone) enqueueAudioTask(() => playCue('goal'));
        if (prefs.haptics) haptic('success');
        if (prefs.voice && ctx.goal) {
          speakRich(buildGoalReachedText(ctx.goal, event.at, lang, units), ctx);
        }
        logger.info('audioCoach', 'Workout goal reached', { at: event.at });
        break;
      }

      case 'workout_complete': {
        stopSpeaking();
        if (prefs.tone) enqueueAudioTask(() => playCue('goal'));
        if (prefs.haptics) haptic('success');
        if (prefs.voice) speakRich(buildWorkoutCompleteText(lang), ctx);
        logger.info('audioCoach', 'Workout complete', { at: event.at });
        break;
      }
    }
  }
}
