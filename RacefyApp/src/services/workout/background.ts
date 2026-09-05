/**
 * Workout evaluation inside the headless background location task.
 *
 * Called on every batch of GPS fixes with the cumulative recorded distance.
 * Reconstructs active seconds from the time anchor, runs the same reducer as
 * the foreground, and announces whatever became due. `firedKeys` in the
 * stored state guarantees the two contexts never announce the same thing.
 *
 * Countdown ticks are dropped here on purpose: GPS fixes arrive every few
 * seconds, so a "3-2-1" from this context would be late and stuttering
 * (Runna's rule — in the background, cue at boundaries only).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../logger';
import type { AudioCoachSettings } from '../../types/audioCoach';
import { DEFAULT_AUDIO_COACH_SETTINGS } from '../../types/audioCoach';
import { advanceWorkout } from './engine';
import { handleWorkoutEvents } from './cues';
import { cancelGoalNotification } from './goalNotification';
import {
  activeSecondsFromAnchor,
  loadTimeAnchor,
  loadWorkoutCuePrefs,
  loadWorkoutEngineState,
  loadWorkoutSession,
  saveWorkoutEngineState,
} from './storage';

/** Same keys the audio coach uses — see backgroundLocation.ts. */
const AUDIO_COACH_SETTINGS_KEY = '@racefy:audioCoach:settings';
const BG_AUDIO_TIER_KEY = '@racefy:audioCoach:tier';

export async function evaluateWorkoutInBackground(totalDistanceM: number | null): Promise<void> {
  try {
    const session = await loadWorkoutSession();
    if (!session) return;
    const state = await loadWorkoutEngineState();
    if (!state || state.completed) return;
    const anchor = await loadTimeAnchor();
    if (!anchor || anchor.paused) return;

    const now = {
      activeSeconds: activeSecondsFromAnchor(anchor),
      distanceM: totalDistanceM ?? state.lastSnapshot.distanceM,
    };
    const { state: next, events } = advanceWorkout(state, now);
    if (events.length === 0) return;

    // Persist first: if speaking throws, the foreground still must not repeat us.
    await saveWorkoutEngineState(next);

    const audible = events.filter((e) => e.type !== 'countdown');
    if (audible.length === 0) return;

    if (audible.some((e) => e.type === 'goal_reached' || e.type === 'workout_complete')) {
      await cancelGoalNotification();
    }

    const [prefs, settingsJson, tierStr] = await Promise.all([
      loadWorkoutCuePrefs(),
      AsyncStorage.getItem(AUDIO_COACH_SETTINGS_KEY),
      AsyncStorage.getItem(BG_AUDIO_TIER_KEY),
    ]);
    const coachSettings: AudioCoachSettings = {
      ...DEFAULT_AUDIO_COACH_SETTINGS,
      ...(settingsJson ? JSON.parse(settingsJson) : {}),
      language: session.language,
    };
    const tier = tierStr === 'plus' || tierStr === 'pro' ? tierStr : 'free';

    logger.info('audioCoach', 'BG workout events', {
      types: audible.map((e) => e.type),
      activeSeconds: Math.round(now.activeSeconds),
      distanceM: Math.round(now.distanceM),
    });

    handleWorkoutEvents(audible, {
      prefs,
      coachSettings,
      tier,
      // No NetInfo in the headless task; an offline device just falls back fast.
      isOnline: true,
      units: session.units,
      goal: session.plan.goal,
    });
  } catch (err) {
    // Never let the workout break GPS tracking.
    logger.error('audioCoach', 'BG workout evaluation failed', { error: err });
  }
}
