/**
 * finishSync runs against a REAL in-memory SQLite (same adapter as the trackingDb
 * tests), so the outbox transitions are exercised for real; only the network
 * (drain / finish / getActivity) is faked.
 */
import * as trackingDb from '../trackingDb';
import {
  __resetFinishSyncForTests,
  backoffDelay,
  configureFinishSync,
  FINISH_DELIVERED_EVENT,
  syncPendingFinishes,
  type FinishSyncDeps,
} from '../finishSync';

jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    gps: jest.fn(),
    activity: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  DeviceEventEmitter: { emit: jest.fn() },
  Platform: { OS: 'android' },
}));

jest.mock('../pointsUploader', () => ({
  drainPoints: jest.fn(),
  toGpsPoints: (points: any[]) => points.map((p) => ({ lat: p.lat, lng: p.lng, seq: p.seq })),
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

const A = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0001';
const B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeffff0002';

const httpError = (status: number, message = `HTTP ${status}`) =>
  Object.assign(new Error(message), { status });

function queue(clientId: string, serverId: number, userId: number | null = 7) {
  trackingDb.startSession(clientId, 'running');
  trackingDb.insertPoints(
    clientId,
    [0, 1, 2].map((i) => ({
      lat: 52 + i * 0.001,
      lng: 21,
      ts: new Date(1e12 + i * 1e4).toISOString(),
    })),
    'fg',
  );
  expect(
    trackingDb.enqueuePendingFinish({
      clientActivityId: clientId,
      serverActivityId: serverId,
      userId,
      payload: { title: 'Evening run', ended_at: '2026-09-20T10:00:00.000Z', event_id: 39 },
      meta: { title: 'Evening run' },
    }),
  ).toBe(true);
}

function makeDeps(over: Partial<FinishSyncDeps> = {}) {
  let clock = 1_000_000;
  const emitted: [string, unknown][] = [];
  const deps: FinishSyncDeps = {
    db: trackingDb,
    // Default: the uploader moves everything in one pass.
    drain: jest.fn(async (opts: any) => {
      const id = opts.session.clientActivityId;
      const n = trackingDb.countUnsynced(id);
      if (n > 0) trackingDb.markSynced(id, 0, 1_000_000);
      return { uploaded: n, remaining: 0 };
    }) as any,
    finish: jest.fn(async (activityId: number) => ({
      data: { id: activityId, status: 'completed' } as any,
      message: 'ok',
      points_earned: 12,
    })),
    getActivity: jest.fn(async (id: number) => ({ id, status: 'in_progress' }) as any),
    currentUserId: () => 7,
    now: () => clock,
    random: () => 0.5,
    emit: (event, payload) => void emitted.push([event, payload]),
    ...over,
  };
  configureFinishSync(deps);
  return { deps, emitted, advance: (ms: number) => (clock += ms) };
}

beforeEach(() => {
  trackingDb.__resetForTests();
  __resetFinishSyncForTests();
});

describe('outbox', () => {
  it('parks the session so the recorder is free, and keeps the track', () => {
    queue(A, 101);

    expect(trackingDb.getActiveSession()).toBeNull();
    expect(trackingDb.countPendingFinishes()).toBe(1);
    expect(trackingDb.getAllPoints(A)).toHaveLength(3);

    // A pending session must survive the retention purge — its points are the only copy.
    trackingDb.purgeFinishedSessions(0);
    expect(trackingDb.getAllPoints(A)).toHaveLength(3);
  });

  it('makes interrupted entries eligible again after an app kill', () => {
    queue(A, 101);
    trackingDb.updatePendingFinish(A, { state: 'syncing' });
    trackingDb.resetInterruptedFinishes();
    expect(trackingDb.getPendingFinish(A)?.state).toBe('pending');
  });
});

describe('delivery', () => {
  it('uploads the track, then finishes with the stored request, then clears the entry', async () => {
    queue(A, 101);
    const { deps, emitted } = makeDeps();

    const outcomes = await syncPendingFinishes();

    expect(outcomes[A].status).toBe('delivered');
    expect(deps.drain).toHaveBeenCalledWith(
      expect.objectContaining({
        session: { clientActivityId: A, serverActivityId: 101 },
        ignoreBackoff: true,
      }),
    );
    expect(deps.finish).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        title: 'Evening run',
        ended_at: '2026-09-20T10:00:00.000Z',
        event_id: 39,
        client_activity_id: A,
        final_points: undefined,
      }),
    );
    expect(trackingDb.countPendingFinishes()).toBe(0);
    expect(trackingDb.getSessionByServerActivityId(101)?.status).toBe('finished');
    expect(emitted.some(([e]) => e === FINISH_DELIVERED_EVENT)).toBe(true);
  });

  it('sends points the uploader could not move along with the finish', async () => {
    queue(A, 101);
    const { deps } = makeDeps({
      drain: jest.fn(async () => ({ uploaded: 0, remaining: 3, backedOff: true })) as any,
    });

    await syncPendingFinishes();

    const payload = (deps.finish as jest.Mock).mock.calls[0][1];
    expect(payload.final_points.map((p: any) => p.seq)).toEqual([0, 1, 2]);
  });

  it('keeps draining across passes for a long track', async () => {
    queue(A, 101);
    let calls = 0;
    const { deps } = makeDeps({
      drain: jest.fn(async () => {
        calls += 1;
        if (calls < 3) return { uploaded: 5000, remaining: 9000 };
        trackingDb.markSynced(A, 0, 1_000_000);
        return { uploaded: 5000, remaining: 0 };
      }) as any,
    });

    await syncPendingFinishes();

    expect(deps.drain).toHaveBeenCalledTimes(3);
    expect(deps.finish).toHaveBeenCalledTimes(1);
  });
});

describe('transient failures', () => {
  it('backs off when the track cannot be uploaded and never calls finish', async () => {
    queue(A, 101);
    const { deps } = makeDeps({
      drain: jest.fn(async () => ({ uploaded: 0, remaining: 3, error: 'Network error' })) as any,
    });

    const outcomes = await syncPendingFinishes();

    expect(outcomes[A]).toEqual({ status: 'retry_later', error: 'Network error' });
    expect(deps.finish).not.toHaveBeenCalled();
    const entry = trackingDb.getPendingFinish(A)!;
    expect(entry.state).toBe('pending');
    expect(entry.attempts).toBe(1);
    expect(entry.nextAttemptAt).toBeGreaterThan(1_000_000);
  });

  it('leaves a backed-off entry alone until it is due — unless forced', async () => {
    queue(A, 101);
    const finish = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue({ data: { id: 101, status: 'completed' }, message: 'ok' });
    const { advance } = makeDeps({ finish });

    await syncPendingFinishes();
    expect((await syncPendingFinishes())[A]).toEqual({ status: 'skipped', reason: 'not_due' });
    expect(finish).toHaveBeenCalledTimes(1);

    // The athlete tapped "retry", or the network came back.
    expect((await syncPendingFinishes({ force: true }))[A].status).toBe('delivered');

    // …and the timed path works too.
    queue(B, 102);
    finish.mockRejectedValueOnce(httpError(503));
    await syncPendingFinishes();
    advance(60 * 60_000);
    expect((await syncPendingFinishes())[B].status).toBe('delivered');
  });

  it('one stuck activity does not hold up the next', async () => {
    queue(A, 101);
    queue(B, 102);
    const finish = jest.fn(async (activityId: number) => {
      if (activityId === 101) throw httpError(500);
      return { data: { id: activityId, status: 'completed' } as any, message: 'ok' };
    });
    makeDeps({ finish });

    const outcomes = await syncPendingFinishes();

    expect(outcomes[A].status).toBe('retry_later');
    expect(outcomes[B].status).toBe('delivered');
  });

  it('grows the backoff ceiling exponentially and caps it', () => {
    const one = () => 1;
    expect(backoffDelay(1, one)).toBe(15_000);
    expect(backoffDelay(2, one)).toBe(30_000);
    expect(backoffDelay(4, one)).toBe(120_000);
    expect(backoffDelay(20, one)).toBe(15 * 60_000);
    expect(backoffDelay(4, () => 0)).toBe(0); // full jitter reaches down to zero
  });
});

describe('verdicts', () => {
  it('treats a refused finish as delivered when the server already has it (lost response)', async () => {
    queue(A, 101);
    const { emitted } = makeDeps({
      finish: jest.fn().mockRejectedValue(httpError(422, 'Activity is not active')),
      getActivity: jest.fn(async (id: number) => ({ id, status: 'completed' }) as any),
    });

    const outcomes = await syncPendingFinishes();

    expect(outcomes[A]).toEqual({ status: 'delivered' });
    expect(trackingDb.countPendingFinishes()).toBe(0);
    expect(emitted.some(([e]) => e === FINISH_DELIVERED_EVENT)).toBe(true);
  });

  it('parks a genuinely refused finish for the athlete and stops retrying it', async () => {
    queue(A, 101);
    const finish = jest.fn().mockRejectedValue(httpError(422, 'The selected event is closed.'));
    makeDeps({ finish });

    expect((await syncPendingFinishes())[A]).toEqual({
      status: 'needs_attention',
      error: 'The selected event is closed.',
    });
    expect(trackingDb.getPendingFinish(A)?.state).toBe('needs_attention');

    // Automatic runs leave it alone…
    expect((await syncPendingFinishes())[A]).toEqual({ status: 'skipped', reason: 'parked' });
    expect(finish).toHaveBeenCalledTimes(1);

    // …the athlete can drop the event and send it again.
    const entry = trackingDb.getPendingFinish(A)!;
    trackingDb.updatePendingFinish(A, { payload: { ...entry.payload, event_id: null } });
    finish.mockResolvedValueOnce({ data: { id: 101, status: 'completed' }, message: 'ok' });

    expect((await syncPendingFinishes({ force: true, only: A }))[A].status).toBe('delivered');
    expect(finish.mock.calls[1][1].event_id).toBeNull();
  });

  it('stops the whole run on 401 without burning attempts', async () => {
    queue(A, 101);
    queue(B, 102);
    const finish = jest.fn().mockRejectedValue(httpError(401, 'Unauthenticated.'));
    makeDeps({ finish });

    const outcomes = await syncPendingFinishes();

    expect(outcomes[A]).toEqual({ status: 'auth_required' });
    expect(outcomes[B]).toBeUndefined();
    expect(finish).toHaveBeenCalledTimes(1);
    expect(trackingDb.getPendingFinish(A)).toMatchObject({ state: 'pending', attempts: 0 });
  });
});

describe('guards', () => {
  it("never sends one account's activity from another account", async () => {
    queue(A, 101, 7);
    const { deps } = makeDeps({ currentUserId: () => 99 });

    expect((await syncPendingFinishes({ force: true }))[A]).toEqual({
      status: 'skipped',
      reason: 'other_user',
    });
    expect(deps.finish).not.toHaveBeenCalled();
  });

  it('runs overlapping triggers one after another, not twice at once', async () => {
    queue(A, 101);
    const { deps } = makeDeps();

    const [first, second] = await Promise.all([syncPendingFinishes(), syncPendingFinishes()]);

    expect(first[A].status).toBe('delivered');
    expect(second[A]).toBeUndefined(); // already gone by the time the second run looked
    expect(deps.finish).toHaveBeenCalledTimes(1);
  });

  it('can target a single entry', async () => {
    queue(A, 101);
    queue(B, 102);
    const { deps } = makeDeps();

    await syncPendingFinishes({ only: B });

    expect(deps.finish).toHaveBeenCalledTimes(1);
    expect(trackingDb.getPendingFinish(A)).not.toBeNull();
    expect(trackingDb.getPendingFinish(B)).toBeNull();
  });
});
