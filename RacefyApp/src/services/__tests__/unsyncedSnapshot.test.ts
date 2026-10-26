import { buildUnsyncedSnapshot, type UnsyncedSnapshotInput } from '../unsyncedSnapshot';
import { createLedger, recordPause, recordResume } from '../activityLifecycleLedger';
import type { Activity } from '../../types/api';

jest.mock('../logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const activity = {
  id: 42,
  sport_type_id: 3,
  sport_type: { name: 'Running' },
  title: 'Running Activity',
  started_at: '2026-10-26T06:00:00.000Z',
} as unknown as Activity;

const input = (patch: Partial<UnsyncedSnapshotInput> = {}): UnsyncedSnapshotInput => ({
  activity,
  attempt: null,
  ledger: null,
  clientActivityId: 'uuid-1',
  lastFixAt: null,
  stats: { distance: 5012.6, duration: 1800, elevation_gain: 33.4, calories: 400 },
  location: null,
  pointsCount: 900,
  errorMessage: 'HTTP 422',
  now: () => new Date('2026-10-26T07:00:00.000Z'),
  ...patch,
});

it('keeps the athlete’s finish-screen choices and their end time', () => {
  const snap = buildUnsyncedSnapshot(
    input({
      attempt: {
        endedAt: '2026-10-26T06:31:00.000Z',
        data: { title: 'Easy run', skip_auto_post: true, event_id: 9, calories: 350 },
      },
    }),
  );
  expect(snap).toMatchObject({
    activityId: 42,
    sportTypeId: 3,
    sportTypeName: 'Running',
    title: 'Easy run',
    skipAutoPost: true,
    eventId: 9,
    calories: 350,
    endedAt: '2026-10-26T06:31:00.000Z',
    clientActivityId: 'uuid-1',
    distance: 5013,
    elevationGain: 33,
    pointsCount: 900,
    lastError: 'HTTP 422',
  });
});

it('falls back to the last GPS fix, then to now, for the end', () => {
  const fix = Date.parse('2026-10-26T06:45:00.000Z');
  expect(buildUnsyncedSnapshot(input({ lastFixAt: fix })).endedAt).toBe('2026-10-26T06:45:00.000Z');
  expect(buildUnsyncedSnapshot(input()).endedAt).toBe('2026-10-26T07:00:00.000Z');
});

it('sends the device pause total only for a dirty ledger', () => {
  const clean = createLedger(42, { pausedTotalSec: 120, pauseStartedAt: null });
  expect(buildUnsyncedSnapshot(input({ ledger: clean })).totalPausedDuration).toBeUndefined();

  // A pause the server never heard about: the ledger is marked dirty on a failed delivery.
  let paused = recordPause(clean, '2026-10-26T06:10:00.000Z');
  paused = recordResume(paused, '2026-10-26T06:11:00.000Z');
  const dirty = { ...paused, dirty: true };
  const snap = buildUnsyncedSnapshot(
    input({ ledger: dirty, attempt: { endedAt: '2026-10-26T06:30:00.000Z' } }),
  );
  expect(snap.totalPausedDuration).toBe(180);
});

it('uses the activity title when nothing was typed', () => {
  expect(buildUnsyncedSnapshot(input()).title).toBe('Running Activity');
});
