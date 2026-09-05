/**
 * Interval sessions: the three presets from the mockup and the "build your
 * own" form (repeats, work, recovery, optional warm-up / cool-down). The form
 * is a flat draft — easier to edit with steppers than a nested block tree —
 * and compiles to a `WorkoutPlan` on save.
 */

import type { WorkoutBlock, WorkoutPlan, WorkoutStep, WorkoutStepEnd } from '../../types/workout';
import { isWorkoutRepeat } from '../../types/workout';
import { newWorkoutId } from './compile';

export interface IntervalStepDraft {
  mode: 'time' | 'distance';
  /** Seconds for `time`, metres for `distance`. */
  value: number;
}

export interface IntervalDraft {
  reps: number;
  work: IntervalStepDraft;
  rest: IntervalStepDraft;
  /** null = no warm-up. */
  warm: IntervalStepDraft | null;
  cool: IntervalStepDraft | null;
  /** Which preset this draft still matches; cleared on any edit. */
  presetId: string | null;
}

export interface IntervalPreset {
  id: string;
  draft: Omit<IntervalDraft, 'presetId'>;
}

const WARM_10 = { mode: 'time', value: 600 } as const;
const COOL_10 = { mode: 'time', value: 600 } as const;

export const INTERVAL_PRESETS: IntervalPreset[] = [
  {
    // 8 × 400 m with 200 m jog
    id: 'p400',
    draft: {
      reps: 8,
      work: { mode: 'distance', value: 400 },
      rest: { mode: 'distance', value: 200 },
      warm: WARM_10,
      cool: COOL_10,
    },
  },
  {
    // 10 × 1 min with 1 min easy
    id: 'p1min',
    draft: {
      reps: 10,
      work: { mode: 'time', value: 60 },
      rest: { mode: 'time', value: 60 },
      warm: WARM_10,
      cool: COOL_10,
    },
  },
  {
    // 4 × 5 min threshold, 90 s float
    id: 'p5min',
    draft: {
      reps: 4,
      work: { mode: 'time', value: 300 },
      rest: { mode: 'time', value: 90 },
      warm: WARM_10,
      cool: COOL_10,
    },
  },
];

export function presetDraft(preset: IntervalPreset): IntervalDraft {
  return {
    ...preset.draft,
    work: { ...preset.draft.work },
    rest: { ...preset.draft.rest },
    warm: preset.draft.warm ? { ...preset.draft.warm } : null,
    cool: preset.draft.cool ? { ...preset.draft.cool } : null,
    presetId: preset.id,
  };
}

export function defaultIntervalDraft(): IntervalDraft {
  return presetDraft(INTERVAL_PRESETS[0]);
}

function toEnd(step: IntervalStepDraft): WorkoutStepEnd {
  return step.mode === 'time'
    ? { type: 'time', seconds: Math.max(1, Math.round(step.value)) }
    : { type: 'distance', meters: Math.max(1, Math.round(step.value)) };
}

function fromEnd(end: WorkoutStepEnd): IntervalStepDraft | null {
  if (end.type === 'time') return { mode: 'time', value: end.seconds };
  if (end.type === 'distance') return { mode: 'distance', value: end.meters };
  return null;
}

/** Compile the form into a plan. `name` is the caller's display label ("8 × 400 m / 200 m"). */
export function buildIntervalPlan(
  draft: IntervalDraft,
  name: string,
  sportTypeId?: number,
): WorkoutPlan {
  const blocks: WorkoutBlock[] = [];
  if (draft.warm && draft.warm.value > 0) {
    blocks.push({ id: 'warm', kind: 'warmup', end: toEnd(draft.warm) });
  }
  const steps: WorkoutStep[] = [{ id: 'work', kind: 'work', end: toEnd(draft.work) }];
  if (draft.rest.value > 0) steps.push({ id: 'rest', kind: 'recovery', end: toEnd(draft.rest) });
  blocks.push({ id: 'rep', times: Math.max(1, Math.round(draft.reps)), steps });
  if (draft.cool && draft.cool.value > 0) {
    blocks.push({ id: 'cool', kind: 'cooldown', end: toEnd(draft.cool) });
  }
  return {
    id: newWorkoutId('int'),
    name,
    mode: 'intervals',
    blocks,
    source: draft.presetId ? 'preset' : 'custom',
    sportTypeId,
  };
}

/**
 * Read a plan back into the form. Plans that don't fit the warm → repeat →
 * cool shape (hand-built later, or from a training plan) return null and the
 * form starts from the default preset.
 */
export function draftFromPlan(plan: WorkoutPlan): IntervalDraft | null {
  if (plan.mode !== 'intervals' || !plan.blocks) return null;
  let warm: IntervalStepDraft | null = null;
  let cool: IntervalStepDraft | null = null;
  let reps: number | null = null;
  let work: IntervalStepDraft | null = null;
  let rest: IntervalStepDraft = { mode: 'time', value: 0 };

  for (const block of plan.blocks) {
    if (isWorkoutRepeat(block)) {
      if (reps !== null) return null;
      reps = block.times;
      const w = block.steps.find((s) => s.kind === 'work');
      const r = block.steps.find((s) => s.kind === 'recovery');
      if (!w) return null;
      work = fromEnd(w.end);
      if (!work) return null;
      if (r) {
        const parsed = fromEnd(r.end);
        if (!parsed) return null;
        rest = parsed;
      }
    } else if (block.kind === 'warmup') {
      warm = fromEnd(block.end);
      if (!warm) return null;
    } else if (block.kind === 'cooldown') {
      cool = fromEnd(block.end);
      if (!cool) return null;
    } else {
      return null;
    }
  }
  if (reps === null || !work) return null;

  const draft: IntervalDraft = { reps, work, rest, warm, cool, presetId: null };
  const match = INTERVAL_PRESETS.find((p) => draftsEqual(presetDraft(p), draft));
  return { ...draft, presetId: match?.id ?? null };
}

function stepEqual(a: IntervalStepDraft | null, b: IntervalStepDraft | null): boolean {
  if (!a || !b) return a === b;
  return a.mode === b.mode && a.value === b.value;
}

export function draftsEqual(a: IntervalDraft, b: IntervalDraft): boolean {
  return (
    a.reps === b.reps &&
    stepEqual(a.work, b.work) &&
    stepEqual(a.rest, b.rest) &&
    stepEqual(a.warm, b.warm) &&
    stepEqual(a.cool, b.cool)
  );
}

/** Which preset (if any) a draft still matches exactly. */
export function matchPreset(draft: IntervalDraft): string | null {
  return INTERVAL_PRESETS.find((p) => draftsEqual(presetDraft(p), draft))?.id ?? null;
}
