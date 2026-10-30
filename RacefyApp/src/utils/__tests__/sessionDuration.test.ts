import { activeSeconds } from '../sessionDuration';
import type { WorkoutSession, WorkoutSessionSet } from '../../types/workouts';

const at = (hhmm: string, day = 29) => `2026-10-${day}T${hhmm}:00Z`;
const now = (hhmm: string, day = 29) => new Date(at(hhmm, day)).getTime();

const set = (started: string | null, completed: string | null, rest: string | null = completed) =>
  ({ started_at: started, completed_at: completed, rest_started_at: rest }) as WorkoutSessionSet;

const session = (started_at: string | null, ...sets: WorkoutSessionSet[]) =>
  ({ started_at, exercises: [{ sets }] }) as unknown as Pick<
    WorkoutSession,
    'started_at' | 'exercises'
  >;

describe('activeSeconds', () => {
  it('runs like a stopwatch through a normal session', () => {
    const s = session(at('10:00'), set(at('10:05'), at('10:07')), set(null, at('10:20')));
    expect(activeSeconds(s, now('10:30'))).toBe(30 * 60);
  });

  it('leaves out the night when the session was left open until the next day', () => {
    const s = session(
      at('19:00', 28),
      set(at('19:05', 28), at('19:10', 28)),
      set(null, at('19:40', 28)),
      set(null, at('12:10', 29)),
      set(null, at('12:40', 29)),
    );
    // 40 min yesterday + 30 min today (12:10 → 12:40); 12:40 → 12:45 is the tail.
    expect(activeSeconds(s, now('12:45', 29))).toBe((40 + 30 + 5) * 60);
  });

  it('stops counting while nothing happens and starts again with the next action', () => {
    const s = session(at('10:00'), set(null, at('10:20')));
    expect(activeSeconds(s, now('10:50'))).toBe(50 * 60);
    expect(activeSeconds(s, now('18:00'))).toBe(20 * 60);
  });

  it('keeps a long set that is in progress', () => {
    const s = session(at('10:00'), set(at('10:05'), null, null));
    expect(activeSeconds(s, now('10:50'))).toBe(50 * 60);
  });

  it('keeps a long set that was finished', () => {
    const s = session(at('10:00'), set(at('10:05'), at('10:50')));
    expect(activeSeconds(s, now('10:55'))).toBe(55 * 60);
  });

  it('ignores stamps from before the start and is 0 without a start', () => {
    const s = session(at('10:00'), set(null, at('09:00')));
    expect(activeSeconds(s, now('10:10'))).toBe(10 * 60);
    expect(activeSeconds(session(null), now('10:10'))).toBe(0);
  });
});
