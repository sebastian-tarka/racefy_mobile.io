import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../../hooks/useUnits';
import {
  buildIntervalPlan,
  defaultIntervalDraft,
  draftFromPlan,
  matchPreset,
  type IntervalDraft,
} from '../../../services/workout/presets';
import { loadLastQuickGoal } from '../../../services/workout/storage';
import type { GuidedWorkout, WorkoutGoal } from '../../../types/workout';
import { describeIntervals, formatGoalShort } from '../../../utils/workoutFormat';

export const METERS_PER_MILE = 1609.344;
const DISTANCE_STEP = 0.5;
const TIME_STEP_MIN = 5;
const MAX_DISTANCE_UNITS = 300;
const MAX_TIME_MIN = 24 * 60;

export type QuickGoalType = WorkoutGoal['type'];
export type TypeChoice = 'open' | QuickGoalType | 'intervals';

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface Options {
  visible: boolean;
  plan: GuidedWorkout | null;
  sportTypeId?: number;
  initialType?: QuickGoalType;
}

/**
 * The goal sheet's form: goal type, distance / time target (stepper, typed
 * value), the interval draft — seeded from the current plan, else the last
 * quick goal — and the goal or interval plan it currently describes.
 */
export function useWorkoutConfigDraft({ visible, plan, sportTypeId, initialType }: Options) {
  const { t } = useTranslation();
  const { units, formatDistance } = useUnits();
  const unitFactor = units === 'imperial' ? METERS_PER_MILE : 1000;

  const [type, setType] = useState<TypeChoice>('distance');
  const [distanceValue, setDistanceValue] = useState(5);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [intervals, setIntervals] = useState<IntervalDraft>(defaultIntervalDraft);

  // Seed from the current plan, else the last quick goal, else defaults.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const seed = (goal: WorkoutGoal) => {
      if (goal.type === 'distance') setDistanceValue(round1(goal.meters / unitFactor));
      else setTimeMinutes(Math.max(1, Math.round(goal.seconds / 60)));
    };
    if (plan?.mode === 'intervals') {
      setIntervals(draftFromPlan(plan) ?? defaultIntervalDraft());
      setType(initialType ?? 'intervals');
    } else if (plan?.mode === 'goal' && plan.goal) {
      seed(plan.goal);
      setType(initialType ?? plan.goal.type);
    } else {
      setType(initialType ?? 'distance');
      loadLastQuickGoal().then((last) => {
        if (!cancelled && last) seed(last);
      });
    }
    setEditing(false);
    return () => {
      cancelled = true;
    };
  }, [visible, plan, unitFactor, initialType]);

  const goal: WorkoutGoal | null = useMemo(() => {
    if (type === 'distance') {
      return { type: 'distance', meters: Math.round(distanceValue * unitFactor) };
    }
    if (type === 'time') return { type: 'time', seconds: timeMinutes * 60 };
    return null;
  }, [type, distanceValue, timeMinutes, unitFactor]);

  // The interval plan as it stands; its label doubles as the footer text.
  const intervalPlan: GuidedWorkout | null = useMemo(() => {
    if (type !== 'intervals') return null;
    const p = buildIntervalPlan(intervals, '', sportTypeId);
    p.name = describeIntervals(p, formatDistance, t);
    return p;
  }, [type, intervals, sportTypeId, formatDistance, t]);

  const goalLabel = goal ? formatGoalShort(goal, formatDistance) : (intervalPlan?.name ?? null);

  const step = (dir: 1 | -1) => {
    setEditing(false);
    if (type === 'distance') {
      setDistanceValue((v) =>
        round1(Math.min(MAX_DISTANCE_UNITS, Math.max(DISTANCE_STEP, v + dir * DISTANCE_STEP))),
      );
    } else {
      setTimeMinutes((v) => Math.min(MAX_TIME_MIN, Math.max(1, v + dir * TIME_STEP_MIN)));
    }
  };

  const startEditing = () => {
    setDraft(type === 'distance' ? String(round1(distanceValue)) : String(timeMinutes));
    setEditing(true);
  };

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      if (type === 'distance') setDistanceValue(round1(Math.min(MAX_DISTANCE_UNITS, parsed)));
      else setTimeMinutes(Math.min(MAX_TIME_MIN, Math.max(1, Math.round(parsed))));
    }
    setEditing(false);
  };

  /** Edit the interval form; any change un-links the preset unless it matches one again. */
  const editIntervals = useCallback((patch: Partial<IntervalDraft>) => {
    setIntervals((prev) => {
      const next = { ...prev, ...patch, presetId: null };
      return { ...next, presetId: matchPreset(next) };
    });
  }, []);

  return {
    type,
    setType,
    distanceValue,
    setDistanceValue,
    timeMinutes,
    setTimeMinutes,
    editing,
    setEditing,
    draft,
    setDraft,
    intervals,
    setIntervals,
    goal,
    intervalPlan,
    goalLabel,
    step,
    startEditing,
    commitDraft,
    editIntervals,
  };
}
