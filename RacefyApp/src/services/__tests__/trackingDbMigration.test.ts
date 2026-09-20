/**
 * Upgrade path v3 → v4 on a database that already holds data. v4 rebuilds
 * pending_finishes (SQLite cannot drop NOT NULL in place) — exactly the kind of
 * migration that loses rows when it goes wrong, so it runs here against a real
 * SQLite file seeded the way a v3 install left it.
 */
import * as trackingDb from '../trackingDb';

jest.mock('../logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), gps: jest.fn() },
}));

const mockSeed = { fn: null as null | ((db: any) => void) };

jest.mock('expo-sqlite', () => {
  const Database = require('better-sqlite3');
  return {
    openDatabaseSync: () => {
      const db = new Database(':memory:');
      mockSeed.fn?.(db);
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

function seedV3(db: any) {
  db.exec(`
    CREATE TABLE activity_sessions (
      client_activity_id TEXT PRIMARY KEY, server_activity_id INTEGER, sport_slug TEXT,
      started_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'recording', next_seq INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE activity_points (
      client_activity_id TEXT NOT NULL, seq INTEGER NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
      ele REAL, ts TEXT NOT NULL, accuracy REAL, speed REAL, hr INTEGER, cum_dist REAL,
      segment_break INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'fg',
      synced INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (client_activity_id, seq)
    );
    CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE pending_finishes (
      client_activity_id TEXT PRIMARY KEY, server_activity_id INTEGER NOT NULL, user_id INTEGER,
      payload TEXT NOT NULL, meta TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, created_at TEXT NOT NULL
    );
    INSERT INTO activity_sessions VALUES ('${UUID}', 101, 'running', '2026-09-20T09:00:00.000Z', 'pending_finish', 2);
    INSERT INTO activity_points (client_activity_id, seq, lat, lng, ts) VALUES
      ('${UUID}', 0, 52.1, 21.0, '2026-09-20T09:00:10.000Z'),
      ('${UUID}', 1, 52.2, 21.0, '2026-09-20T09:00:20.000Z');
    INSERT INTO pending_finishes VALUES
      ('${UUID}', 101, 7, '{"title":"Evening run","event_id":39}', '{"title":"Evening run"}',
       'needs_attention', 3, 12345, 'The selected event is closed.', '2026-09-20T10:00:00.000Z');
    PRAGMA user_version = 3;
  `);
}

afterEach(() => {
  mockSeed.fn = null;
  trackingDb.__resetForTests();
});

it('keeps a queued activity — every field — and its track across the v4 rebuild', () => {
  mockSeed.fn = seedV3;
  trackingDb.__resetForTests();

  expect(trackingDb.getPendingFinish(UUID)).toEqual({
    clientActivityId: UUID,
    serverActivityId: 101,
    startPayload: null,
    userId: 7,
    payload: { title: 'Evening run', event_id: 39 },
    meta: { title: 'Evening run' },
    state: 'needs_attention',
    attempts: 3,
    nextAttemptAt: 12345,
    lastError: 'The selected event is closed.',
    createdAt: '2026-09-20T10:00:00.000Z',
  });
  expect(trackingDb.getAllPoints(UUID)).toHaveLength(2);
  expect(trackingDb.getSession(UUID)).toMatchObject({
    serverActivityId: 101,
    status: 'pending_finish',
    startPayload: null,
  });
});

it('after the upgrade the outbox accepts an activity the server has never seen', () => {
  mockSeed.fn = seedV3;
  trackingDb.__resetForTests();

  const offline = 'bbbbbbbb-bbbb-4ccc-8ddd-eeeeffff0001';
  trackingDb.startSession(offline, 'running', { startPayload: { sport_type_id: 1 } });
  expect(
    trackingDb.enqueuePendingFinish({
      clientActivityId: offline,
      serverActivityId: null,
      startPayload: { sport_type_id: 1 },
      userId: 7,
      payload: {},
      meta: {},
    }),
  ).toBe(true);

  expect(trackingDb.getPendingFinish(offline)).toMatchObject({
    serverActivityId: null,
    startPayload: { sport_type_id: 1 },
  });
  expect(trackingDb.countPendingFinishes()).toBe(2);
});

it('is a no-op on a database that is already v4', () => {
  trackingDb.__resetForTests();
  trackingDb.startSession(UUID, 'running');
  // Second open of the same module state must not try to ALTER/rebuild again.
  expect(() => trackingDb.getSession(UUID)).not.toThrow();
});
