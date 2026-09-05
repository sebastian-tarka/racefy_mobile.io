import type { WorkoutPlan } from '../../../types/workout';
import { compileWorkout, estimateWorkoutTotals } from '../compile';
import {
  advanceWorkout,
  createWorkoutEngine,
  getWorkoutProgress,
  replaceWorkoutFromCurrent,
  skipWorkoutSegment,
  type EngineSnapshot,
  type WorkoutEngineEvent,
  type WorkoutEngineState,
} from '../engine';

const snap = (activeSeconds: number, distanceM: number): EngineSnapshot => ({
  activeSeconds,
  distanceM,
});

const distanceGoal = (meters: number): WorkoutPlan => ({
  id: 'g1',
  name: '',
  mode: 'goal',
  goal: { type: 'distance', meters },
  source: 'quick',
});

const timeGoal = (seconds: number): WorkoutPlan => ({
  id: 'g2',
  name: '',
  mode: 'goal',
  goal: { type: 'time', seconds },
  source: 'quick',
});

const intervals: WorkoutPlan = {
  id: 'i1',
  name: '2 × 400/200',
  mode: 'intervals',
  source: 'preset',
  blocks: [
    { id: 'wu', kind: 'warmup', end: { type: 'time', seconds: 60 } },
    {
      id: 'rep',
      times: 2,
      steps: [
        { id: 'w', kind: 'work', end: { type: 'distance', meters: 400 } },
        { id: 'r', kind: 'recovery', end: { type: 'time', seconds: 30 } },
      ],
    },
    { id: 'cd', kind: 'cooldown', end: { type: 'open' } },
  ],
};

/** Run a sequence of snapshots through the engine, collecting all events. */
function run(state: WorkoutEngineState, snaps: EngineSnapshot[]) {
  const events: WorkoutEngineEvent[] = [];
  for (const s of snaps) {
    const r = advanceWorkout(state, s);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const types = (events: WorkoutEngineEvent[]) => events.map((e) => e.type);

describe('compileWorkout', () => {
  it('turns a goal into a single work segment', () => {
    expect(compileWorkout(distanceGoal(5000))).toEqual([
      { index: 0, kind: 'work', end: { type: 'distance', meters: 5000 } },
    ]);
  });

  it('expands repeats and numbers them', () => {
    const segs = compileWorkout(intervals);
    expect(segs.map((s) => s.kind)).toEqual([
      'warmup',
      'work',
      'recovery',
      'work',
      'recovery',
      'cooldown',
    ]);
    expect(segs.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(segs[1].repeatLabel).toEqual({ current: 1, total: 2 });
    expect(segs[3].repeatLabel).toEqual({ current: 2, total: 2 });
    expect(segs[5].repeatLabel).toBeUndefined();
  });

  it('estimates totals with the given pace and flags open steps', () => {
    // 60 s warmup + 2×(400 m @ 5:00 = 120 s + 30 s) = 360 s; distance = 60/300 km + 800 m + 2×(30/300 km)
    const t = estimateWorkoutTotals(intervals, 300);
    expect(t.seconds).toBe(360);
    expect(t.meters).toBe(Math.round(200 + 800 + 200));
    expect(t.hasOpen).toBe(true);
  });
});

describe('simple distance goal', () => {
  it('fires halfway then goal_reached exactly once and keeps counting', () => {
    let state = createWorkoutEngine(distanceGoal(5000), snap(0, 0));
    const r = run(state, [
      snap(60, 200),
      snap(600, 2400),
      snap(650, 2600), // halfway
      snap(700, 2800),
      snap(1500, 5050), // goal
      snap(1600, 5400), // overshoot — nothing new
    ]);
    state = r.state;
    expect(types(r.events)).toEqual(['halfway', 'goal_reached']);
    const goal = r.events[1] as Extract<WorkoutEngineEvent, { type: 'goal_reached' }>;
    // Boundary is the exact goal distance; time is interpolated between the
    // 700 s/2800 m and 1500 s/5050 m readings → 1482 s.
    expect(goal.at.distanceM).toBe(5000);
    expect(goal.at.activeSeconds).toBeCloseTo(1482.2, 0);
    expect(state.completed).toBe(true);

    const p = getWorkoutProgress(state, snap(1600, 5400));
    expect(p?.fraction).toBe(1);
    expect(p?.overshoot?.distanceM).toBe(400);
    expect(p?.overshoot?.activeSeconds).toBeCloseTo(117.8, 0);
  });

  it('does not fire approach/countdown for a goal (nothing to switch to)', () => {
    const state = createWorkoutEngine(distanceGoal(1000), snap(0, 0));
    const r = run(state, [snap(100, 920), snap(120, 1000)]);
    expect(types(r.events)).toEqual(['halfway', 'goal_reached']);
  });

  it('reports remaining and fraction mid-way', () => {
    const state = createWorkoutEngine(distanceGoal(5000), snap(0, 0));
    const p = getWorkoutProgress(state, snap(300, 1250));
    expect(p?.remaining).toEqual({ type: 'distance', meters: 3750 });
    expect(p?.fraction).toBeCloseTo(0.25);
    expect(p?.overshoot).toBeNull();
  });

  it('is idempotent: replaying a snapshot after a fired event yields nothing', () => {
    let state = createWorkoutEngine(distanceGoal(1000), snap(0, 0));
    state = advanceWorkout(state, snap(100, 1000)).state;
    expect(advanceWorkout(state, snap(100, 1000)).events).toEqual([]);
    expect(advanceWorkout(state, snap(50, 500)).events).toEqual([]);
  });

  it('a state restored with firedKeys does not re-announce (foreground ↔ background)', () => {
    const fresh = createWorkoutEngine(distanceGoal(1000), snap(0, 0));
    const fromBackground: WorkoutEngineState = {
      ...fresh,
      firedKeys: ['goal:half', 'goal:reached'],
      completed: true,
      completedAt: snap(300, 1000),
    };
    expect(advanceWorkout(fromBackground, snap(310, 1020)).events).toEqual([]);
  });
});

describe('simple time goal', () => {
  it('uses active seconds only — a pause (frozen clock) fires nothing', () => {
    let state = createWorkoutEngine(timeGoal(600), snap(0, 0));
    let r = advanceWorkout(state, snap(299, 1000));
    expect(r.events).toEqual([]);
    state = r.state;
    // Paused: clock frozen, distance may still creep from GPS drift.
    r = advanceWorkout(state, snap(299, 1003));
    expect(r.events).toEqual([]);
    state = r.state;
    r = advanceWorkout(state, snap(300, 1005));
    expect(types(r.events)).toEqual(['halfway']);
    state = r.state;
    r = advanceWorkout(state, snap(600, 2000));
    expect(types(r.events)).toEqual(['goal_reached']);
    expect((r.events[0] as any).at).toEqual({ activeSeconds: 600, distanceM: 2000 });
  });
});

describe('intervals', () => {
  it('walks through warmup, repeats and open cooldown with the right cues', () => {
    let state = createWorkoutEngine(intervals, snap(0, 0));
    const r = run(state, [
      snap(30, 100),
      snap(57, 190), // countdown 3
      snap(58, 193), // countdown 2
      snap(59, 197), // countdown 1
      snap(60, 200), // warmup done → work 1/2 starts
      snap(100, 520), // 320 m into 400 m → approach (80 m left)
      snap(130, 620), // 420 m → work 1 done → recovery 1 starts (start dist = 600)
      snap(160, 700), // 30 s recovery done → work 2/2 starts
      snap(300, 1150), // 450 m → work 2 done → recovery 2 starts
      snap(331, 1200), // recovery 2 done → cooldown (open) starts
      snap(900, 3000), // open never ends on its own
    ]);
    state = r.state;
    expect(types(r.events)).toEqual([
      'countdown',
      'countdown',
      'countdown',
      'segment_start',
      'approach',
      'segment_start',
      'segment_start',
      'segment_start',
      'segment_start',
    ]);
    const cds = r.events.filter((e) => e.type === 'countdown') as any[];
    expect(cds.map((c) => c.secondsLeft)).toEqual([3, 2, 1]);
    expect(state.completed).toBe(false);
    expect(state.segments[state.currentIndex].kind).toBe('cooldown');

    // Recovery 1 started exactly at 600 m, not at the 620 m reading.
    const rec1Start = r.events[5] as Extract<WorkoutEngineEvent, { type: 'segment_start' }>;
    expect(rec1Start.segment.kind).toBe('recovery');
    expect(rec1Start.segment.repeatLabel).toEqual({ current: 1, total: 2 });
    // ...and its time was interpolated between the 100 s/520 m and 130 s/620 m readings.
    // (600 − 520) / (620 − 520) of the 30 s → 124 s. Verified through the next boundary:
    // recovery 1 (30 s) ended at 154 s, before the 160 s reading.
    const work2Start = r.events[6] as Extract<WorkoutEngineEvent, { type: 'segment_start' }>;
    expect(work2Start.segment.repeatLabel).toEqual({ current: 2, total: 2 });
  });

  it('a stale snapshot that jumps over a whole segment still emits every boundary once', () => {
    const state = createWorkoutEngine(intervals, snap(0, 0));
    // App was in background: one snapshot lands after warmup, work 1 AND recovery 1.
    const r = advanceWorkout(state, snap(200, 900));
    expect(types(r.events)).toEqual(['segment_start', 'segment_start', 'segment_start']);
    // No stale countdown/approach for the already-finished segments.
    expect(r.events.some((e) => e.type === 'countdown' || e.type === 'approach')).toBe(false);
    expect(r.state.currentIndex).toBe(3);
    // Boundaries interpolated on the (0,0)→(200,900) line:
    // warmup ends at 60 s → 270 m; work 1 ends at 670 m → 148.9 s;
    // recovery 1 ends at 178.9 s → 805 m — that is where work 2 starts.
    expect(r.state.segmentStart.activeSeconds).toBeCloseTo(178.9, 1);
    expect(r.state.segmentStart.distanceM).toBeCloseTo(805, 0);
  });

  it('skip ends an open segment and completes the workout', () => {
    let state = createWorkoutEngine(intervals, snap(0, 0));
    state = run(state, [snap(400, 1500)]).state;
    expect(state.segments[state.currentIndex].end.type).toBe('open');
    const r = skipWorkoutSegment(state, snap(450, 1700));
    expect(types(r.events)).toEqual(['workout_complete']);
    expect(r.state.completed).toBe(true);
    expect(r.state.completedAt).toEqual({ activeSeconds: 450, distanceM: 1700 });
  });

  it("skip mid-segment suppresses that segment's pending countdown", () => {
    let state = createWorkoutEngine(intervals, snap(0, 0));
    const r = skipWorkoutSegment(state, snap(10, 30));
    state = r.state;
    expect(types(r.events)).toEqual(['segment_start']);
    expect(state.currentIndex).toBe(1);
    expect(state.firedKeys).toEqual(
      expect.arrayContaining(['seg:0:cd:3', 'seg:0:cd:2', 'seg:0:cd:1', 'seg:1:start']),
    );
  });

  it('in-run edit keeps completed segments and renumbers the rest', () => {
    let state = createWorkoutEngine(intervals, snap(0, 0));
    state = run(state, [snap(60, 200)]).state; // in work 1/2
    const edited = replaceWorkoutFromCurrent(state, [
      { index: 0, kind: 'work', end: { type: 'distance', meters: 800 } },
      { index: 1, kind: 'cooldown', end: { type: 'time', seconds: 120 } },
    ]);
    expect(edited.segments.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(edited.currentIndex).toBe(1);
    expect(edited.segments[1].end).toEqual({ type: 'distance', meters: 800 });
    // Still measured from the original segment start.
    expect(edited.segmentStart).toEqual({ activeSeconds: 60, distanceM: 200 });
    const p = getWorkoutProgress(edited, snap(100, 600));
    expect(p?.remaining).toEqual({ type: 'distance', meters: 400 });
  });
});
