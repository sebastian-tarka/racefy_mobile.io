// ============ WORKOUT CONFIGURATOR ============
//
// A workout is what the athlete asked the app to guide them through during one
// recording: a simple goal ("run 5 km", "ride for 45 minutes") or, later, a
// structured interval session. The recording itself is untouched by this —
// distance and time keep counting after a goal is reached; the workout only
// decides WHEN to say something and WHAT the progress card shows.
//
// All distances are metres and all durations are seconds, regardless of the
// user's unit preference. Unit conversion happens at the UI/voice edge only.

export type WorkoutStepKind = 'warmup' | 'work' | 'recovery' | 'cooldown';

export type WorkoutStepEnd =
  | { type: 'time'; seconds: number }
  | { type: 'distance'; meters: number }
  /** Ends only when the athlete taps "next" — the Garmin "Lap" pattern. */
  | { type: 'open' };

export interface WorkoutStep {
  id: string;
  kind: WorkoutStepKind;
  end: WorkoutStepEnd;
}

export interface WorkoutRepeat {
  id: string;
  times: number;
  steps: WorkoutStep[];
}

export type WorkoutBlock = WorkoutStep | WorkoutRepeat;

export function isWorkoutRepeat(block: WorkoutBlock): block is WorkoutRepeat {
  return (block as WorkoutRepeat).times !== undefined;
}

export type WorkoutGoal = { type: 'time'; seconds: number } | { type: 'distance'; meters: number };

export type WorkoutPlanSource = 'quick' | 'preset' | 'custom' | 'training_plan';

export interface WorkoutPlan {
  id: string;
  name: string;
  mode: 'goal' | 'intervals';
  /** Set when `mode === 'goal'`. */
  goal?: WorkoutGoal;
  /** Set when `mode === 'intervals'`. */
  blocks?: WorkoutBlock[];
  source: WorkoutPlanSource;
  sportTypeId?: number;
}

/**
 * Flattened plan — repeats expanded, one entry per thing the athlete actually
 * runs through. The engine only ever looks at this.
 */
export interface CompiledSegment {
  index: number;
  kind: WorkoutStepKind;
  end: WorkoutStepEnd;
  /** "3 of 6" for segments that came out of a repeat. */
  repeatLabel?: { current: number; total: number };
}

/** Which of the cues the athlete wants to hear/feel. Local-only preference. */
export interface WorkoutCuePrefs {
  /** Spoken announcements (halfway, goal reached, segment changes). */
  voice: boolean;
  /** Short earcons on boundaries. */
  tone: boolean;
  /** Vibration alongside every cue — the only channel that works with the phone in a pocket and no headphones. */
  haptics: boolean;
  /** "Halfway there" announcement for simple goals. */
  halfway: boolean;
  /** 3-2-1 beeps before a time-based segment ends (intervals only). */
  countdown: boolean;
}

export const DEFAULT_WORKOUT_CUE_PREFS: WorkoutCuePrefs = {
  voice: true,
  tone: true,
  haptics: true,
  halfway: true,
  countdown: true,
};
