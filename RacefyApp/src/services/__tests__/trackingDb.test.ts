/**
 * trackingDb tests run against a REAL in-memory SQLite (better-sqlite3) through
 * a thin adapter that mimics the expo-sqlite sync API — so seq assignment,
 * markSynced ranges and purge SQL are exercised for real, not against a fake.
 */

import * as trackingDb from '../trackingDb';

jest.mock('../logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), gps: jest.fn() },
}));

jest.mock('expo-sqlite', () => {
  const Database = require('better-sqlite3');

  return {
    openDatabaseSync: () => {
      const db = new Database(':memory:');

      return {
        execSync: (sql: string) => db.exec(sql),
        runSync: (sql: string, params: any[] = []) => db.prepare(sql).run(...params),
        getFirstSync: (sql: string, params: any[] = []) => db.prepare(sql).get(...params) ?? null,
        getAllSync: (sql: string, params: any[] = []) => db.prepare(sql).all(...params),
        withTransactionSync: (fn: () => void) => db.transaction(fn)(),
      };
    },
  };
});

const UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0000';

function makePoints(count: number, fromSeqTime = 0): trackingDb.NewTrackPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    lat: 52.2 + i * 0.001,
    lng: 21.0,
    ts: new Date(1700000000000 + (fromSeqTime + i) * 10_000).toISOString(),
    cumDist: (fromSeqTime + i) * 100,
  }));
}

describe('trackingDb', () => {
  beforeEach(() => {
    trackingDb.__resetForTests();
    trackingDb.startSession(UUID, 'running');
  });

  it('assigns monotonic seq numbers across separate inserts', () => {
    const first = trackingDb.insertPoints(UUID, makePoints(3), 'fg');
    const second = trackingDb.insertPoints(UUID, makePoints(2, 3), 'bg');

    expect(first).toEqual({ firstSeq: 0, lastSeq: 2 });
    expect(second).toEqual({ firstSeq: 3, lastSeq: 4 });

    const all = trackingDb.getAllPoints(UUID);
    expect(all.map((p) => p.seq)).toEqual([0, 1, 2, 3, 4]);
    expect(all[3].source).toBe('bg');
  });

  it('binds server activity id and resolves sessions both ways', () => {
    trackingDb.bindServerActivity(UUID, 123);

    expect(trackingDb.getActiveSession()?.serverActivityId).toBe(123);
    expect(trackingDb.getSessionByServerActivityId(123)?.clientActivityId).toBe(UUID);
  });

  it('marks seq ranges synced and reports unsynced correctly', () => {
    trackingDb.insertPoints(UUID, makePoints(5), 'fg');

    expect(trackingDb.countUnsynced(UUID)).toBe(5);

    trackingDb.markSynced(UUID, 0, 2);

    expect(trackingDb.countUnsynced(UUID)).toBe(2);
    expect(trackingDb.getUnsyncedPoints(UUID).map((p) => p.seq)).toEqual([3, 4]);
  });

  it('returns points after a given seq (foreground catch-up after background)', () => {
    trackingDb.insertPoints(UUID, makePoints(4), 'fg');

    const tail = trackingDb.getPointsAfterSeq(UUID, 1);

    expect(tail.map((p) => p.seq)).toEqual([2, 3]);
  });

  it('exposes the last point with its cumulative distance', () => {
    trackingDb.insertPoints(UUID, makePoints(3), 'fg');

    expect(trackingDb.getLastPoint(UUID)?.cumDist).toBe(200);
  });

  it('persists and round-trips segment_break', () => {
    const points = makePoints(2);
    points[1].segmentBreak = true;

    trackingDb.insertPoints(UUID, points, 'fg');

    const all = trackingDb.getAllPoints(UUID);
    expect(all[0].segmentBreak).toBe(false);
    expect(all[1].segmentBreak).toBe(true);
  });

  it('finished sessions are no longer active and get purged after keepDays', () => {
    trackingDb.insertPoints(UUID, makePoints(2), 'fg');
    trackingDb.markSessionFinished(UUID);

    expect(trackingDb.getActiveSession()).toBeNull();

    // started_at is "now", so a 7-day purge keeps it…
    trackingDb.purgeFinishedSessions(7);
    expect(trackingDb.getAllPoints(UUID)).toHaveLength(2);

    // …and a 0-day purge removes it (cutoff = now)
    trackingDb.purgeFinishedSessions(-1);
    expect(trackingDb.getAllPoints(UUID)).toHaveLength(0);
  });

  it('discardSession removes the session and its points', () => {
    trackingDb.insertPoints(UUID, makePoints(2), 'fg');

    trackingDb.discardSession(UUID);

    expect(trackingDb.getActiveSession()).toBeNull();
    expect(trackingDb.getAllPoints(UUID)).toHaveLength(0);
  });

  it('insertPoints without a session returns null and stores nothing', () => {
    const result = trackingDb.insertPoints('missing-session', makePoints(2), 'fg');

    expect(result).toBeNull();
    expect(trackingDb.getAllPoints('missing-session')).toHaveLength(0);
  });
});
