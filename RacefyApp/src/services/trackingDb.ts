/**
 * Persistent GPS point log — single source of truth for activity recording.
 *
 * Every accepted GPS point is written here synchronously (foreground callback
 * and background TaskManager task alike) before any upload attempt. The uploader
 * drains `synced = 0` rows in `seq` order and marks them synced only after the
 * server acknowledges the batch, so process death, network loss or app kill can
 * no longer lose points (previously points lived in JS memory + coarse
 * AsyncStorage snapshots).
 *
 * `seq` is a per-activity monotonic sequence assigned inside the insert
 * transaction; together with the device-minted `client_activity_id` UUID it
 * makes batch uploads idempotent server-side (unique (gps_track_id, client_seq)).
 *
 * Plain module (no React) so the headless background task can use it. All calls
 * are synchronous (expo-sqlite sync API) to keep writes inside the GPS callback
 * atomic and ordered; the DB is WAL with a busy timeout as a cross-context guard.
 */
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { logger } from './logger';

const DB_NAME = 'racefy_tracking.db';
const SCHEMA_VERSION = 3;

export type PointSource = 'fg' | 'bg';

export interface NewTrackPoint {
  lat: number;
  lng: number;
  ele?: number;
  /** ISO 8601 timestamp (matches GpsPoint.time) */
  ts: string;
  accuracy?: number;
  speed?: number;
  hr?: number;
  /** Cumulative accepted distance (meters) at this point */
  cumDist?: number;
  /** First point of a new segment (after a GPS gap) */
  segmentBreak?: boolean;
}

export interface StoredTrackPoint extends NewTrackPoint {
  seq: number;
  source: PointSource;
  synced: boolean;
}

export interface ActivitySession {
  clientActivityId: string;
  serverActivityId: number | null;
  sportSlug: string | null;
  startedAt: string;
  /**
   * `pending_finish`: the athlete saved the activity, the server has not heard
   * yet (see pending_finishes). Not "active" any more — the recording screen is
   * free — but not purgeable either: its points are the only copy of the track.
   */
  status: 'recording' | 'finishing' | 'pending_finish' | 'finished';
}

export type PendingFinishState = 'pending' | 'syncing' | 'needs_attention';

/** One saved-but-not-yet-delivered activity (the finish outbox). */
export interface PendingFinish {
  clientActivityId: string;
  serverActivityId: number;
  userId: number | null;
  /** The finish request body, minus `final_points` (points stay in activity_points). */
  payload: Record<string, unknown>;
  /** What the queue UI shows: title, sport, distance, duration, timestamps. */
  meta: Record<string, unknown>;
  state: PendingFinishState;
  attempts: number;
  /** Epoch ms before which the automatic sync leaves this entry alone. */
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: string;
}

const isWeb = Platform.OS === 'web';

let db: SQLiteDatabase | null = null;

function getDb(): SQLiteDatabase | null {
  if (isWeb) return null;
  if (db) return db;

  try {
    // Lazy require so importing this module never crashes contexts without
    // native modules (e.g. jest without the mock, web).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require('expo-sqlite') as typeof import('expo-sqlite');
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync('PRAGMA synchronous = NORMAL;');
    db.execSync('PRAGMA busy_timeout = 5000;');
    migrate(db);
    return db;
  } catch (error) {
    logger.error('gps', 'Failed to open tracking DB', { error });
    db = null;
    return null;
  }
}

function migrate(database: SQLiteDatabase): void {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const version = row?.user_version ?? 0;

  if (version >= SCHEMA_VERSION) return;

  database.withTransactionSync(() => {
    if (version < 1) {
      database.execSync(`
        CREATE TABLE IF NOT EXISTS activity_sessions (
          client_activity_id TEXT PRIMARY KEY,
          server_activity_id INTEGER,
          sport_slug TEXT,
          started_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'recording',
          next_seq INTEGER NOT NULL DEFAULT 0
        );
      `);
      database.execSync(`
        CREATE TABLE IF NOT EXISTS activity_points (
          client_activity_id TEXT NOT NULL,
          seq INTEGER NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          ele REAL,
          ts TEXT NOT NULL,
          accuracy REAL,
          speed REAL,
          hr INTEGER,
          cum_dist REAL,
          segment_break INTEGER NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'fg',
          synced INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (client_activity_id, seq)
        );
      `);
      database.execSync(`
        CREATE INDEX IF NOT EXISTS idx_points_unsynced
          ON activity_points (client_activity_id, synced, seq);
      `);
    }
    if (version < 2) {
      // Uploader state (backoff counters) — survives JS context restarts
      database.execSync(`
        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    }
    if (version < 3) {
      // Finish outbox: activities the athlete saved while the server could not
      // be told. In SQLite rather than AsyncStorage so the entry and the
      // session's status change are one transaction, and so the (large) track
      // is never copied — it stays where it already is, in activity_points.
      database.execSync(`
        CREATE TABLE IF NOT EXISTS pending_finishes (
          client_activity_id TEXT PRIMARY KEY,
          server_activity_id INTEGER NOT NULL,
          user_id INTEGER,
          payload TEXT NOT NULL,
          meta TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL
        );
      `);
    }
    database.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}

function rowToPoint(row: any): StoredTrackPoint {
  return {
    seq: row.seq,
    lat: row.lat,
    lng: row.lng,
    ele: row.ele ?? undefined,
    ts: row.ts,
    accuracy: row.accuracy ?? undefined,
    speed: row.speed ?? undefined,
    hr: row.hr ?? undefined,
    cumDist: row.cum_dist ?? undefined,
    segmentBreak: !!row.segment_break,
    source: row.source as PointSource,
    synced: !!row.synced,
  };
}

// ── Sessions ────────────────────────────────────────────────────────────────

export function startSession(clientActivityId: string, sportSlug?: string): void {
  const database = getDb();
  if (!database) return;

  database.runSync(
    `INSERT OR IGNORE INTO activity_sessions (client_activity_id, sport_slug, started_at, status, next_seq)
     VALUES (?, ?, ?, 'recording', 0);`,
    [clientActivityId, sportSlug ?? null, new Date().toISOString()],
  );
}

export function bindServerActivity(clientActivityId: string, serverActivityId: number): void {
  const database = getDb();
  if (!database) return;

  database.runSync(
    'UPDATE activity_sessions SET server_activity_id = ? WHERE client_activity_id = ?;',
    [serverActivityId, clientActivityId],
  );
}

/**
 * The single session still in `recording`/`finishing` state (newest wins).
 * A `pending_finish` session is deliberately not "active": the athlete is done
 * with it and may already be recording the next one.
 */
export function getActiveSession(): ActivitySession | null {
  const database = getDb();
  if (!database) return null;

  const row = database.getFirstSync<any>(
    `SELECT * FROM activity_sessions WHERE status IN ('recording', 'finishing')
     ORDER BY started_at DESC LIMIT 1;`,
  );
  if (!row) return null;

  return {
    clientActivityId: row.client_activity_id,
    serverActivityId: row.server_activity_id ?? null,
    sportSlug: row.sport_slug ?? null,
    startedAt: row.started_at,
    status: row.status,
  };
}

export function getSessionByServerActivityId(serverActivityId: number): ActivitySession | null {
  const database = getDb();
  if (!database) return null;

  const row = database.getFirstSync<any>(
    'SELECT * FROM activity_sessions WHERE server_activity_id = ? ORDER BY started_at DESC LIMIT 1;',
    [serverActivityId],
  );
  if (!row) return null;

  return {
    clientActivityId: row.client_activity_id,
    serverActivityId: row.server_activity_id ?? null,
    sportSlug: row.sport_slug ?? null,
    startedAt: row.started_at,
    status: row.status,
  };
}

export function markSessionFinished(clientActivityId: string): void {
  const database = getDb();
  if (!database) return;

  database.runSync(
    `UPDATE activity_sessions SET status = 'finished' WHERE client_activity_id = ?;`,
    [clientActivityId],
  );
}

/** Delete a session and all its points (user discarded the activity). */
export function discardSession(clientActivityId: string): void {
  const database = getDb();
  if (!database) return;

  database.withTransactionSync(() => {
    database.runSync('DELETE FROM activity_points WHERE client_activity_id = ?;', [
      clientActivityId,
    ]);
    database.runSync('DELETE FROM activity_sessions WHERE client_activity_id = ?;', [
      clientActivityId,
    ]);
  });
}

/** Purge finished sessions older than keepDays (called on app start). */
export function purgeFinishedSessions(keepDays = 7): void {
  const database = getDb();
  if (!database) return;

  const cutoff = new Date(Date.now() - keepDays * 24 * 3600 * 1000).toISOString();

  database.withTransactionSync(() => {
    database.runSync(
      `DELETE FROM activity_points WHERE client_activity_id IN
         (SELECT client_activity_id FROM activity_sessions WHERE status = 'finished' AND started_at < ?);`,
      [cutoff],
    );
    database.runSync(
      `DELETE FROM activity_sessions WHERE status = 'finished' AND started_at < ?;`,
      [cutoff],
    );
  });
}

// ── Finish outbox ───────────────────────────────────────────────────────────

function rowToPendingFinish(row: any): PendingFinish {
  const parse = (raw: string) => {
    try {
      return JSON.parse(raw) ?? {};
    } catch {
      return {};
    }
  };
  return {
    clientActivityId: row.client_activity_id,
    serverActivityId: row.server_activity_id,
    userId: row.user_id ?? null,
    payload: parse(row.payload),
    meta: parse(row.meta),
    state: row.state,
    attempts: row.attempts ?? 0,
    nextAttemptAt: row.next_attempt_at ?? 0,
    lastError: row.last_error ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Record that the athlete finished this session and park the session as
 * `pending_finish` — one transaction, so there is never a saved activity
 * without an outbox entry or the other way round. Returns false when the DB
 * is unavailable (web, native module missing): the caller must then finish
 * online the old way.
 */
export function enqueuePendingFinish(entry: {
  clientActivityId: string;
  serverActivityId: number;
  userId: number | null;
  payload: Record<string, unknown>;
  meta: Record<string, unknown>;
}): boolean {
  const database = getDb();
  if (!database) return false;

  try {
    database.withTransactionSync(() => {
      database.runSync(
        `INSERT OR REPLACE INTO pending_finishes
           (client_activity_id, server_activity_id, user_id, payload, meta, state, attempts, next_attempt_at, last_error, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, 0, NULL, ?);`,
        [
          entry.clientActivityId,
          entry.serverActivityId,
          entry.userId,
          JSON.stringify(entry.payload),
          JSON.stringify(entry.meta),
          new Date().toISOString(),
        ],
      );
      database.runSync(
        `UPDATE activity_sessions SET status = 'pending_finish', server_activity_id = ?
         WHERE client_activity_id = ?;`,
        [entry.serverActivityId, entry.clientActivityId],
      );
    });
    return true;
  } catch (error) {
    logger.error('activity', 'Failed to enqueue pending finish', { error });
    return false;
  }
}

export function listPendingFinishes(): PendingFinish[] {
  const database = getDb();
  if (!database) return [];
  return database
    .getAllSync<any>('SELECT * FROM pending_finishes ORDER BY created_at ASC;')
    .map(rowToPendingFinish);
}

export function getPendingFinish(clientActivityId: string): PendingFinish | null {
  const database = getDb();
  if (!database) return null;
  const row = database.getFirstSync<any>(
    'SELECT * FROM pending_finishes WHERE client_activity_id = ?;',
    [clientActivityId],
  );
  return row ? rowToPendingFinish(row) : null;
}

/** Is this server activity one the athlete has already saved (and we still owe the server)? */
export function getPendingFinishByServerActivityId(serverActivityId: number): PendingFinish | null {
  const database = getDb();
  if (!database) return null;
  const row = database.getFirstSync<any>(
    'SELECT * FROM pending_finishes WHERE server_activity_id = ? LIMIT 1;',
    [serverActivityId],
  );
  return row ? rowToPendingFinish(row) : null;
}

export function countPendingFinishes(): number {
  const database = getDb();
  if (!database) return 0;
  const row = database.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM pending_finishes;');
  return row?.n ?? 0;
}

export function updatePendingFinish(
  clientActivityId: string,
  patch: Partial<
    Pick<PendingFinish, 'state' | 'attempts' | 'nextAttemptAt' | 'lastError' | 'payload'>
  >,
): void {
  const database = getDb();
  if (!database) return;

  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.state !== undefined) (sets.push('state = ?'), values.push(patch.state));
  if (patch.attempts !== undefined) (sets.push('attempts = ?'), values.push(patch.attempts));
  if (patch.nextAttemptAt !== undefined)
    (sets.push('next_attempt_at = ?'), values.push(patch.nextAttemptAt));
  if (patch.lastError !== undefined) (sets.push('last_error = ?'), values.push(patch.lastError));
  if (patch.payload !== undefined)
    (sets.push('payload = ?'), values.push(JSON.stringify(patch.payload)));
  if (sets.length === 0) return;

  database.runSync(`UPDATE pending_finishes SET ${sets.join(', ')} WHERE client_activity_id = ?;`, [
    ...values,
    clientActivityId,
  ]);
}

/** The server has the activity: drop the entry and let the session be purged in due course. */
export function completePendingFinish(clientActivityId: string): void {
  const database = getDb();
  if (!database) return;
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM pending_finishes WHERE client_activity_id = ?;', [
      clientActivityId,
    ]);
    database.runSync(
      `UPDATE activity_sessions SET status = 'finished' WHERE client_activity_id = ?;`,
      [clientActivityId],
    );
  });
}

/** The athlete threw the queued activity away: entry, session and track all go. */
export function discardPendingFinish(clientActivityId: string): void {
  const database = getDb();
  if (!database) return;
  database.runSync('DELETE FROM pending_finishes WHERE client_activity_id = ?;', [
    clientActivityId,
  ]);
  discardSession(clientActivityId);
}

/** A sync that was cut short (app killed mid-request) left entries `syncing` — make them eligible again. */
export function resetInterruptedFinishes(): void {
  const database = getDb();
  if (!database) return;
  database.runSync(`UPDATE pending_finishes SET state = 'pending' WHERE state = 'syncing';`);
}

// ── Points ──────────────────────────────────────────────────────────────────

/**
 * Insert points, assigning monotonic seq numbers inside the same transaction.
 * Returns the assigned seq range, or null if the DB is unavailable.
 */
export function insertPoints(
  clientActivityId: string,
  points: NewTrackPoint[],
  source: PointSource,
): { firstSeq: number; lastSeq: number } | null {
  const database = getDb();
  if (!database || points.length === 0) return null;

  let firstSeq = 0;

  try {
    database.withTransactionSync(() => {
      const row = database.getFirstSync<{ next_seq: number }>(
        'SELECT next_seq FROM activity_sessions WHERE client_activity_id = ?;',
        [clientActivityId],
      );

      if (row == null) {
        throw new Error(`No tracking session for ${clientActivityId}`);
      }

      firstSeq = row.next_seq;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        database.runSync(
          `INSERT OR IGNORE INTO activity_points
             (client_activity_id, seq, lat, lng, ele, ts, accuracy, speed, hr, cum_dist, segment_break, source, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            clientActivityId,
            firstSeq + i,
            p.lat,
            p.lng,
            p.ele ?? null,
            p.ts,
            p.accuracy ?? null,
            p.speed ?? null,
            p.hr ?? null,
            p.cumDist ?? null,
            p.segmentBreak ? 1 : 0,
            source,
          ],
        );
      }

      database.runSync('UPDATE activity_sessions SET next_seq = ? WHERE client_activity_id = ?;', [
        firstSeq + points.length,
        clientActivityId,
      ]);
    });
  } catch (error) {
    logger.error('gps', 'Failed to insert tracking points', {
      error,
      count: points.length,
    });
    return null;
  }

  return { firstSeq, lastSeq: firstSeq + points.length - 1 };
}

export function getUnsyncedPoints(clientActivityId: string, limit = 200): StoredTrackPoint[] {
  const database = getDb();
  if (!database) return [];

  const rows = database.getAllSync<any>(
    `SELECT * FROM activity_points WHERE client_activity_id = ? AND synced = 0
     ORDER BY seq ASC LIMIT ?;`,
    [clientActivityId, limit],
  );

  return rows.map(rowToPoint);
}

export function countUnsynced(clientActivityId: string): number {
  const database = getDb();
  if (!database) return 0;

  const row = database.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM activity_points WHERE client_activity_id = ? AND synced = 0;',
    [clientActivityId],
  );

  return row?.c ?? 0;
}

export function markSynced(clientActivityId: string, seqFrom: number, seqTo: number): void {
  const database = getDb();
  if (!database) return;

  database.runSync(
    'UPDATE activity_points SET synced = 1 WHERE client_activity_id = ? AND seq >= ? AND seq <= ?;',
    [clientActivityId, seqFrom, seqTo],
  );
}

export function getAllPoints(clientActivityId: string): StoredTrackPoint[] {
  const database = getDb();
  if (!database) return [];

  const rows = database.getAllSync<any>(
    'SELECT * FROM activity_points WHERE client_activity_id = ? ORDER BY seq ASC;',
    [clientActivityId],
  );

  return rows.map(rowToPoint);
}

export function getLastPoint(clientActivityId: string): StoredTrackPoint | null {
  const database = getDb();
  if (!database) return null;

  const row = database.getFirstSync<any>(
    'SELECT * FROM activity_points WHERE client_activity_id = ? ORDER BY seq DESC LIMIT 1;',
    [clientActivityId],
  );

  return row ? rowToPoint(row) : null;
}

export function getPointsAfterSeq(clientActivityId: string, seq: number): StoredTrackPoint[] {
  const database = getDb();
  if (!database) return [];

  const rows = database.getAllSync<any>(
    'SELECT * FROM activity_points WHERE client_activity_id = ? AND seq > ? ORDER BY seq ASC;',
    [clientActivityId, seq],
  );

  return rows.map(rowToPoint);
}

// ── KV (uploader state) ─────────────────────────────────────────────────────

export function getKv(key: string): string | null {
  const database = getDb();
  if (!database) return null;

  const row = database.getFirstSync<{ value: string }>('SELECT value FROM kv WHERE key = ?;', [
    key,
  ]);

  return row?.value ?? null;
}

export function setKv(key: string, value: string): void {
  const database = getDb();
  if (!database) return;

  database.runSync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    [key, value],
  );
}

export function deleteKv(key: string): void {
  const database = getDb();
  if (!database) return;

  database.runSync('DELETE FROM kv WHERE key = ?;', [key]);
}

/** Test-only: reset the cached DB handle (jest mock swaps the underlying store). */
export function __resetForTests(): void {
  db = null;
}
