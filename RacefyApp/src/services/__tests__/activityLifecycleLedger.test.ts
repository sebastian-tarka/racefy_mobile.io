import {
  clearLedger,
  createLedger,
  enqueueOp,
  flushPendingOps,
  isTransientError,
  loadLedger,
  recordPause,
  recordResume,
  saveLedger,
  totalPausedAt,
  type LedgerStorage,
} from '../activityLifecycleLedger';

jest.mock('../logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

const T = (minutes: number, seconds = 0) =>
  new Date(Date.UTC(2026, 8, 20, 10, minutes, seconds)).toISOString();

function memoryStorage(): LedgerStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
  };
}

const networkError = () => new TypeError('Network request failed');
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('pause accounting', () => {
  it('sums completed pauses', () => {
    let l = createLedger(1);
    l = recordResume(recordPause(l, T(5)), T(7)); // 2 min
    l = recordResume(recordPause(l, T(20)), T(20, 30)); // 30 s
    expect(l.pausedTotalSec).toBe(150);
    expect(l.pauseStartedAt).toBeNull();
  });

  it('counts a pause still running at the end', () => {
    const l = recordPause(createLedger(1, { pausedTotalSec: 60 }), T(30));
    expect(totalPausedAt(l, T(40))).toBe(60 + 600);
  });

  it('never goes negative when the end predates the running pause', () => {
    // "Use GPS time" finishes at the last GPS fix, which can be before the Stop press.
    const l = recordPause(createLedger(1), T(30));
    expect(totalPausedAt(l, T(25))).toBe(0);
  });

  it('ignores a second pause and a resume with no pause running', () => {
    let l = recordPause(createLedger(1), T(5));
    l = recordPause(l, T(6));
    expect(l.pauseStartedAt).toBe(T(5));
    expect(recordResume(createLedger(1), T(9)).pausedTotalSec).toBe(0);
  });

  it('can be seeded from the server after an app restart', () => {
    const l = createLedger(1, { pausedTotalSec: 300, pauseStartedAt: T(10) });
    expect(totalPausedAt(l, T(12))).toBe(300 + 120);
  });
});

describe('persistence', () => {
  it('round-trips through storage and clears', () => {
    const storage = memoryStorage();
    const l = enqueueOp(recordPause(createLedger(7), T(1)), { op: 'pause', at: T(1) });
    saveLedger(storage, l);
    expect(loadLedger(storage, 7)).toEqual(l);
    clearLedger(storage, 7);
    expect(loadLedger(storage, 7)).toBeNull();
  });

  it('does not hand one activity the ledger of another', () => {
    const storage = memoryStorage();
    storage.set('lifecycle:8', JSON.stringify(createLedger(9)));
    expect(loadLedger(storage, 8)).toBeNull();
  });

  it('survives corrupt storage', () => {
    const storage = memoryStorage();
    storage.set('lifecycle:3', '{not json');
    expect(loadLedger(storage, 3)).toBeNull();
  });
});

describe('isTransientError', () => {
  it('treats no-answer, 5xx and 429 as retryable, other 4xx as a verdict', () => {
    expect(isTransientError(networkError())).toBe(true);
    expect(isTransientError(httpError(500))).toBe(true);
    expect(isTransientError(httpError(503))).toBe(true);
    expect(isTransientError(httpError(429))).toBe(true);
    expect(isTransientError(httpError(422))).toBe(false);
    expect(isTransientError(httpError(404))).toBe(false);
  });
});

describe('flushPendingOps', () => {
  const twoOps = () => {
    let l = createLedger(5);
    l = enqueueOp(l, { op: 'pause', at: T(5) });
    l = enqueueOp(l, { op: 'resume', at: T(8) });
    return l;
  };

  it('delivers oldest-first with the original timestamps and stays dirty', async () => {
    const calls: string[] = [];
    const api = {
      pauseActivity: jest.fn(async (_id: number, o: { at?: string }) => {
        calls.push(`pause@${o.at}`);
        return { status: 'paused' };
      }),
      resumeActivity: jest.fn(async (_id: number, o: { at?: string }) => {
        calls.push(`resume@${o.at}`);
        return { status: 'in_progress' };
      }),
    };

    const res = await flushPendingOps(twoOps(), api);

    expect(calls).toEqual([`pause@${T(5)}`, `resume@${T(8)}`]);
    expect(res.drained).toBe(true);
    expect(res.ledger.pendingOps).toEqual([]);
    expect(res.activity).toEqual({ status: 'in_progress' });
    // Delivered late is still "late": finish keeps sending the device's figure.
    expect(res.ledger.dirty).toBe(true);
  });

  it('stops at the first network failure and keeps the rest in order', async () => {
    const api = {
      pauseActivity: jest.fn().mockRejectedValue(networkError()),
      resumeActivity: jest.fn(),
    };

    const res = await flushPendingOps(twoOps(), api);

    expect(res.drained).toBe(false);
    expect(res.ledger.pendingOps.map((o) => o.op)).toEqual(['pause', 'resume']);
    expect(api.resumeActivity).not.toHaveBeenCalled();
  });

  it('keeps the tail when the network drops between two calls', async () => {
    const api = {
      pauseActivity: jest.fn().mockResolvedValue({ status: 'paused' }),
      resumeActivity: jest.fn().mockRejectedValue(httpError(503)),
    };

    const res = await flushPendingOps(twoOps(), api);

    expect(res.drained).toBe(false);
    expect(res.ledger.pendingOps).toEqual([{ op: 'resume', at: T(8) }]);
    expect(res.activity).toEqual({ status: 'paused' });
  });

  it('drops a call the server refuses outright and carries on', async () => {
    const api = {
      pauseActivity: jest.fn().mockRejectedValue(httpError(422)),
      resumeActivity: jest.fn().mockResolvedValue({ status: 'in_progress' }),
    };

    const res = await flushPendingOps(twoOps(), api);

    expect(res.drained).toBe(true);
    expect(res.ledger.pendingOps).toEqual([]);
    expect(api.resumeActivity).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on an empty queue', async () => {
    const api = { pauseActivity: jest.fn(), resumeActivity: jest.fn() };
    const res = await flushPendingOps(createLedger(5), api);
    expect(res).toEqual({ ledger: createLedger(5), activity: null, drained: true });
    expect(api.pauseActivity).not.toHaveBeenCalled();
  });
});
