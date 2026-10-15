import type { StrengthExercise, StrengthSessionSummary } from '../../../types/api';

const set = (
  n: number,
  weight: number | null,
  reps: number | null,
  done = true,
  rest: number | null = 120,
) => ({
  set_number: n,
  weight_kg: done ? weight : null,
  reps: done ? reps : null,
  duration_seconds: null,
  is_completed: done,
  rest_seconds: done ? rest : null,
});

export const rowing: StrengthExercise = {
  exercise_order: 2,
  exercise_id: 12,
  name: 'Wiosłowanie sztangą w opadzie',
  muscle_group: 'back',
  planned: {
    sets: 4,
    target_type: 'reps',
    reps_min: 8,
    reps_max: 10,
    rest_seconds: 120,
    suggested_weight_kg: 50,
  },
  sets: [set(1, 55, 8, true, null), set(2, 55, 8), set(3, 50, 8), set(4, 55, 8, false)],
  sets_completed: 3,
  volume_kg: 1280,
  best_set: { weight_kg: 55, reps: 8, duration_seconds: null },
  previous: {
    session_id: 16,
    completed_at: '2026-10-07 18:40:12',
    best_set: { weight_kg: 50, reps: 10, duration_seconds: null },
    volume_kg: 2000,
  },
  progress: { weight_delta_kg: 5, reps_delta: 0, duration_delta_seconds: 0 },
};

export const curls: StrengthExercise = {
  exercise_order: 3,
  exercise_id: 13,
  name: 'Uginanie ramion',
  muscle_group: 'other',
  planned: {
    sets: 2,
    target_type: 'reps',
    reps_min: 10,
    reps_max: 12,
    rest_seconds: 60,
    suggested_weight_kg: null,
  },
  sets: [set(1, 12.5, 12, true, 60), set(2, 12.5, 10, true, 60)],
  sets_completed: 2,
  volume_kg: 275,
  best_set: { weight_kg: 12.5, reps: 12, duration_seconds: null },
  previous: null,
  progress: null,
};

export const facePulls: StrengthExercise = {
  exercise_order: 4,
  exercise_id: 14,
  name: 'Face pull',
  muscle_group: 'other',
  planned: {
    sets: 2,
    target_type: 'reps',
    reps_min: 15,
    reps_max: 15,
    rest_seconds: 60,
    suggested_weight_kg: 20,
  },
  sets: [set(1, null, null, false), set(2, null, null, false)],
  sets_completed: 0,
  volume_kg: 0,
  best_set: null,
  previous: null,
  progress: null,
};

export function makeSession(over: Partial<StrengthSessionSummary> = {}): StrengthSessionSummary {
  return {
    id: 20,
    workout_id: 41,
    workout_plan_id: 7,
    workout_name: 'PULL',
    day_label: 'Dzień 2',
    duration_seconds: 2621,
    rpe: 5,
    notes: null,
    description_is_auto: true,
    stats: {
      sets_total: 8,
      sets_completed: 5,
      volume_kg: 1555,
      exercises: 3,
      exercises_completed: 2,
    },
    highlights: [
      {
        exercise_order: 2,
        name: rowing.name,
        type: 'weight',
        from: { weight_kg: 50, reps: 10, duration_seconds: null },
        to: { weight_kg: 55, reps: 8, duration_seconds: null },
        weight_delta_kg: 5,
        reps_delta: 0,
        duration_delta_seconds: 0,
      },
    ],
    exercises: [rowing, curls, facePulls],
    ...over,
  };
}
