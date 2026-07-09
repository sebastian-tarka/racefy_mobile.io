/**
 * pointsUploader tests — real in-memory SQLite (better-sqlite3 adapter for
 * expo-sqlite) + mocked fetch. Covers batching, mark-synced-on-ack, backoff
 * persistence and the 422 permanent-refusal path.
 */

import * as trackingDb from '../trackingDb';
import { drainPoints, resetUploaderBackoff, toGpsPoints } from '../pointsUploader';

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

jest.mock('../../config/api', () => ({ API_BASE_URL: 'https://api.test/api' }));
jest.mock('../api', () => ({ appendXdebugTrigger: (url: string) => url }));
jest.mock('../backgroundApiClient', () => ({ getAuthToken: jest.fn(async () => 'token-123') }));
jest.mock('../../i18n', () => ({ getCurrentLanguage: () => 'en' }));

const UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0001';

function okResponse(totalPoints: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ total_points: totalPoints, stats: { avg_speed: 2.5, max_speed: 4 } }),
  };
}

function errorResponse(status: number, message = 'error') {
  return { ok: false, status, json: async () => ({ message }) };
}

function seedPoints(count: number) {
  trackingDb.insertPoints(
    UUID,
    Array.from({ length: count }, (_, i) => ({
      lat: 52.2 + i * 0.001,
      lng: 21.0,
      ts: new Date(1700000000000 + i * 10_000).toISOString(),
      cumDist: i * 100,
    })),
    'fg',
  );
}

describe('pointsUploader.drainPoints', () => {
  beforeEach(() => {
    trackingDb.__resetForTests();
    trackingDb.startSession(UUID, 'running');
    trackingDb.bindServerActivity(UUID, 42);
    resetUploaderBackoff();
    (global as any).fetch = jest.fn();
  });

  it('no-ops without an active session', () => {
    trackingDb.markSessionFinished(UUID);

    return drainPoints().then((result) => {
      expect(result).toEqual({ uploaded: 0, remaining: 0 });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('uploads in seq-ordered batches of 200 and marks them synced only on ack', async () => {
    seedPoints(450);
    (global.fetch as jest.Mock).mockResolvedValue(okResponse(450));

    const result = await drainPoints();

    expect(result.uploaded).toBe(450);
    expect(result.remaining).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(3); // 200 + 200 + 50

    const firstBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(firstBody.seq_from).toBe(0);
    expect(firstBody.seq_to).toBe(199);
    expect(firstBody.client_activity_id).toBe(UUID);
    expect(firstBody.client_distance).toBe(19900); // cum_dist of seq 199
    expect(firstBody.points).toHaveLength(200);
    expect(firstBody.points[0].seq).toBe(0);

    expect(trackingDb.countUnsynced(UUID)).toBe(0);
  });

  it('keeps points unsynced and backs off after a server error', async () => {
    seedPoints(10);
    (global.fetch as jest.Mock).mockResolvedValue(errorResponse(500, 'boom'));

    const result = await drainPoints();

    expect(result.uploaded).toBe(0);
    expect(result.remaining).toBe(10);
    expect(result.error).toBe('boom');
    expect(trackingDb.countUnsynced(UUID)).toBe(10);

    // Second call inside the backoff window does not hit the network
    (global.fetch as jest.Mock).mockClear();
    const second = await drainPoints();

    expect(second.backedOff).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('resumes after resetUploaderBackoff and retries the SAME batch (idempotent)', async () => {
    seedPoints(10);
    (global.fetch as jest.Mock).mockResolvedValueOnce(errorResponse(500));
    await drainPoints();

    resetUploaderBackoff();
    (global.fetch as jest.Mock).mockResolvedValue(okResponse(10));
    const result = await drainPoints();

    expect(result.uploaded).toBe(10);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(body.seq_from).toBe(0); // same batch retried
    expect(trackingDb.countUnsynced(UUID)).toBe(0);
  });

  it('drops the batch from the queue on 422 (server permanently refuses)', async () => {
    seedPoints(5);
    (global.fetch as jest.Mock).mockResolvedValue(errorResponse(422, 'not active'));

    const result = await drainPoints();

    expect(result.uploaded).toBe(0);
    // Marked synced so we stop retrying; rows stay in SQLite until purge
    expect(trackingDb.countUnsynced(UUID)).toBe(0);
    expect(trackingDb.getAllPoints(UUID)).toHaveLength(5);
  });

  it('network exception triggers backoff, not a crash', async () => {
    seedPoints(3);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const result = await drainPoints();

    expect(result.uploaded).toBe(0);
    expect(result.error).toBe('offline');
    expect(trackingDb.countUnsynced(UUID)).toBe(3);
  });
});

describe('pointsUploader.toGpsPoints', () => {
  it('maps stored points to the API payload shape', () => {
    const mapped = toGpsPoints([
      {
        seq: 7,
        lat: 1,
        lng: 2,
        ele: 3,
        ts: '2026-07-09T10:00:00.000Z',
        speed: 2.5,
        accuracy: 8,
        hr: 140,
        cumDist: 500,
        segmentBreak: true,
        source: 'fg',
        synced: false,
      },
    ]);

    expect(mapped[0]).toEqual({
      lat: 1,
      lng: 2,
      ele: 3,
      time: '2026-07-09T10:00:00.000Z',
      speed: 2.5,
      accuracy: 8,
      hr: 140,
      seq: 7,
      segment_break: true,
    });
  });
});
