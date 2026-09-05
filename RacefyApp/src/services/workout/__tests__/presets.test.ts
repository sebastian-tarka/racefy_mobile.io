import { compileWorkout, estimateWorkoutTotals } from '../compile';
import {
  INTERVAL_PRESETS,
  buildIntervalPlan,
  draftFromPlan,
  matchPreset,
  presetDraft,
} from '../presets';

describe('interval presets', () => {
  it('8 × 400 m / 200 m compiles to warm-up, 16 repeat segments and cool-down', () => {
    const plan = buildIntervalPlan(presetDraft(INTERVAL_PRESETS[0]), '8 × 400 m / 200 m');
    const segs = compileWorkout(plan);
    expect(segs).toHaveLength(1 + 16 + 1);
    expect(segs[0].kind).toBe('warmup');
    expect(segs[1]).toMatchObject({
      kind: 'work',
      end: { type: 'distance', meters: 400 },
      repeatLabel: { current: 1, total: 8 },
    });
    expect(segs[2]).toMatchObject({ kind: 'recovery', end: { type: 'distance', meters: 200 } });
    expect(segs[17].kind).toBe('cooldown');
    expect(plan.source).toBe('preset');
  });

  it('estimates ≈ 49 min for the 400 m preset at 6:00/km', () => {
    const plan = buildIntervalPlan(presetDraft(INTERVAL_PRESETS[0]), '');
    // 600 + 8×(400 m → 144 s + 200 m → 72 s) + 600 = 2928 s
    expect(estimateWorkoutTotals(plan, 360).seconds).toBe(2928);
  });

  it('round-trips a preset plan back into the form and recognises the preset', () => {
    const plan = buildIntervalPlan(presetDraft(INTERVAL_PRESETS[1]), '');
    const draft = draftFromPlan(plan);
    expect(draft).not.toBeNull();
    expect(draft?.presetId).toBe('p1min');
    expect(draft?.reps).toBe(10);
    expect(draft?.work).toEqual({ mode: 'time', value: 60 });
  });

  it('an edited draft no longer matches any preset and builds a custom plan', () => {
    const draft = { ...presetDraft(INTERVAL_PRESETS[0]), reps: 6, presetId: null };
    expect(matchPreset(draft)).toBeNull();
    const plan = buildIntervalPlan(draft, '6 × 400 m / 200 m');
    expect(plan.source).toBe('custom');
    expect(compileWorkout(plan)).toHaveLength(1 + 12 + 1);
  });

  it('omits warm-up / cool-down / recovery when they are empty', () => {
    const draft = {
      ...presetDraft(INTERVAL_PRESETS[0]),
      warm: null,
      cool: null,
      rest: { mode: 'time' as const, value: 0 },
      presetId: null,
    };
    const segs = compileWorkout(buildIntervalPlan(draft, ''));
    expect(segs).toHaveLength(8);
    expect(segs.every((s) => s.kind === 'work')).toBe(true);
  });
});
