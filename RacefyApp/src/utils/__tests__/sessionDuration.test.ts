import {
  MAX_SESSION_DURATION_SECONDS,
  overrunDurationSuggestion,
  setsSpanSeconds,
} from '../sessionDuration';
import type { WorkoutSession, WorkoutSessionSet } from '../../types/workouts';

const set = (started_at: string | null, completed_at: string | null) =>
  ({ started_at, completed_at }) as WorkoutSessionSet;

const session = (...sets: WorkoutSessionSet[]) =>
  ({ exercises: [{ sets }] }) as unknown as Pick<WorkoutSession, 'exercises'>;

describe('setsSpanSeconds', () => {
  it('runs from the first set touched to the last one completed', () => {
    const s = session(
      set('2026-10-29T10:00:00Z', '2026-10-29T10:02:00Z'),
      set(null, '2026-10-29T10:45:00Z'),
      set(null, null),
    );
    expect(setsSpanSeconds(s)).toBe(2700);
  });

  it('starts at a completed_at when the set was ticked without being started', () => {
    expect(
      setsSpanSeconds(
        session(set(null, '2026-10-29T10:00:00Z'), set(null, '2026-10-29T10:30:00Z')),
      ),
    ).toBe(1800);
  });

  it('is null without timestamps or with a single instant', () => {
    expect(setsSpanSeconds(session(set(null, null)))).toBeNull();
    expect(setsSpanSeconds(session(set(null, '2026-10-29T10:00:00Z')))).toBeNull();
    expect(setsSpanSeconds(null)).toBeNull();
  });
});

describe('overrunDurationSuggestion', () => {
  it('offers the span for a session left running overnight', () => {
    const s = session(set('2026-10-29T12:00:00Z', null), set(null, '2026-10-29T12:50:00Z'));
    expect(overrunDurationSuggestion(s)).toBe(3000);
  });

  it('offers nothing when even the sets span more than the cap', () => {
    const s = session(
      set('2026-10-28T08:00:00Z', '2026-10-28T08:05:00Z'),
      set(null, '2026-10-29T12:00:00Z'),
    );
    expect(setsSpanSeconds(s)! > MAX_SESSION_DURATION_SECONDS).toBe(true);
    expect(overrunDurationSuggestion(s)).toBeNull();
  });
});
