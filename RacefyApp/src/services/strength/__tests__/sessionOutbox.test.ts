import { createStrengthOutbox, type OutboxEvent, type StrengthTransport } from '../sessionOutbox';
import type { WorkoutSession } from '../../../types/workouts';

const httpError = (status: number, message = `HTTP ${status}`) =>
  Object.assign(new Error(message), { status });
const networkError = () => new Error('Network request failed');

const session = (patch: Partial<WorkoutSession> = {}): WorkoutSession =>
  ({
    id: 1,
    status: 'in_progress',
    scheduled_for: '2026-10-25',
    moved_from: null,
    workout_name: 'Push',
    day_label: null,
    workout_plan_id: 2,
    workout_id: 7,
    activity_id: null,
    started_at: '2026-10-25T10:00:00Z',
    completed_at: null,
    duration_seconds: null,
    rpe: null,
    notes: null,
    created_at: '',
    updated_at: '',
    ...patch,
  }) as WorkoutSession;

function setup(
  userId: number | null = 5,
  onEmit?: (e: OutboxEvent, o: ReturnType<typeof createStrengthOutbox>) => void,
) {
  const kv = new Map<string, string>();
  const events: OutboxEvent[] = [];
  const transport: jest.Mocked<StrengthTransport> = {
    updateSet: jest.fn().mockResolvedValue({ data: {}, stats: {} }),
    deleteSet: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue({
      data: session({ status: 'completed', activity_id: 99 }),
      activity_id: 99,
    }),
    getSession: jest.fn(),
  };
  let currentUser = userId;
  const outbox = createStrengthOutbox({
    store: {
      get: (k) => kv.get(k) ?? null,
      set: (k, v) => void kv.set(k, v),
      delete: (k) => void kv.delete(k),
    },
    transport,
    currentUserId: () => currentUser,
    emit: (e) => {
      events.push(e);
      onEmit?.(e, outbox);
    },
  });
  return { outbox, transport, events, kv, setUser: (id: number | null) => (currentUser = id) };
}

describe('strength session outbox', () => {
  it('sends ops in order and empties the queue', async () => {
    const { outbox, transport } = setup();
    outbox.enqueue(1, { kind: 'set', setId: 10, body: { start: true } });
    outbox.enqueue(1, { kind: 'set', setId: 10, body: { is_completed: true } });
    outbox.enqueue(1, { kind: 'delete', setId: 11 });

    await expect(outbox.flush()).resolves.toBe('delivered');

    expect(transport.updateSet.mock.calls).toEqual([
      [10, { start: true }],
      [10, { is_completed: true }],
    ]);
    expect(transport.deleteSet).toHaveBeenCalledWith(11);
    expect(outbox.hasPending()).toBe(false);
  });

  it('keeps everything queued when the network is down, and sends it later', async () => {
    const { outbox, transport } = setup();
    transport.updateSet.mockRejectedValueOnce(networkError());
    outbox.enqueue(1, { kind: 'set', setId: 10, body: { is_completed: true } });
    outbox.enqueue(1, { kind: 'set', setId: 11, body: { is_completed: true } });

    await expect(outbox.flush()).resolves.toBe('offline');
    expect(outbox.pendingOps(1)).toHaveLength(2);
    expect(transport.updateSet).toHaveBeenCalledTimes(1);

    await expect(outbox.flush()).resolves.toBe('delivered');
    expect(outbox.hasPending(1)).toBe(false);
    expect(transport.updateSet.mock.calls.map((c) => c[0])).toEqual([10, 10, 11]);
  });

  it.each([500, 503, 429])('treats %i as transient', async (status) => {
    const { outbox, transport } = setup();
    transport.updateSet.mockRejectedValueOnce(httpError(status));
    outbox.enqueue(1, { kind: 'set', setId: 10, body: {} });
    await expect(outbox.flush()).resolves.toBe('offline');
    expect(outbox.hasPending(1)).toBe(true);
  });

  it('stops on 401 and keeps the queue', async () => {
    const { outbox, transport } = setup();
    transport.updateSet.mockRejectedValueOnce(httpError(401));
    outbox.enqueue(1, { kind: 'set', setId: 10, body: {} });
    await expect(outbox.flush()).resolves.toBe('auth_required');
    expect(outbox.hasPending(1)).toBe(true);
  });

  it('drops an op the server refuses, reports it, and carries on', async () => {
    const { outbox, transport, events } = setup();
    transport.updateSet.mockRejectedValueOnce(httpError(422, 'Invalid reps'));
    outbox.enqueue(1, { kind: 'set', setId: 10, body: { reps: -1 } });
    outbox.enqueue(1, { kind: 'set', setId: 11, body: { reps: 5 } });

    await outbox.flush();

    expect(transport.updateSet).toHaveBeenCalledTimes(2);
    expect(outbox.hasPending()).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'rejected', sessionId: 1, message: 'Invalid reps' }),
    );
  });

  it('counts a 404 on delete as done', async () => {
    const { outbox, transport, events } = setup();
    transport.deleteSet.mockRejectedValueOnce(httpError(404));
    outbox.enqueue(1, { kind: 'delete', setId: 10 });
    await outbox.flush();
    expect(outbox.hasPending()).toBe(false);
    expect(events.some((e) => e.type === 'rejected')).toBe(false);
  });

  it('sends complete after the sets, with the time Finish was tapped, and clears the snapshot', async () => {
    const { outbox, transport, events } = setup();
    outbox.saveSnapshot(session());
    outbox.enqueue(1, { kind: 'set', setId: 10, body: { is_completed: true } });
    outbox.enqueue(1, {
      kind: 'complete',
      input: { duration_seconds: 3600, completed_at: '2026-10-25T11:00:00Z' },
    });
    expect(outbox.hasPendingComplete(1)).toBe(true);

    await outbox.flush();

    expect(transport.updateSet.mock.invocationCallOrder[0]).toBeLessThan(
      transport.complete.mock.invocationCallOrder[0],
    );
    expect(transport.complete).toHaveBeenCalledWith(1, {
      duration_seconds: 3600,
      completed_at: '2026-10-25T11:00:00Z',
    });
    expect(outbox.readSnapshot()).toBeNull();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'completed', sessionId: 1, activityId: 99 }),
    );
  });

  it('emits completed only once the op is off the queue', async () => {
    let pendingAtEmit: boolean | null = null;
    const { outbox } = setup(5, (e, o) => {
      if (e.type === 'completed') pendingAtEmit = o.hasPendingComplete(1);
    });
    outbox.enqueue(1, { kind: 'complete', input: { completed_at: 'x' } });
    await outbox.flush();
    expect(pendingAtEmit).toBe(false);
  });

  it('treats 409 on complete as delivered when the server already has it completed', async () => {
    const { outbox, transport, events } = setup();
    transport.complete.mockRejectedValueOnce(httpError(409, 'Not in progress'));
    transport.getSession.mockResolvedValueOnce(session({ status: 'completed', activity_id: 42 }));
    outbox.enqueue(1, { kind: 'complete', input: { completed_at: 'x' } });

    await outbox.flush();

    expect(outbox.hasPending()).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'completed', sessionId: 1, activityId: 42 }),
    );
    expect(events.some((e) => e.type === 'rejected')).toBe(false);
  });

  it('reports a 409 on complete when the session is not completed (e.g. skipped)', async () => {
    const { outbox, transport, events } = setup();
    transport.complete.mockRejectedValueOnce(httpError(409, 'Not in progress'));
    transport.getSession.mockResolvedValueOnce(session({ status: 'skipped' }));
    outbox.enqueue(1, { kind: 'complete', input: { completed_at: 'x' } });

    await outbox.flush();

    expect(outbox.hasPending()).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'rejected' }));
  });

  it('never sends another account’s queue', async () => {
    const { outbox, transport, setUser } = setup(5);
    outbox.enqueue(1, { kind: 'set', setId: 10, body: {} });
    setUser(6);
    await expect(outbox.flush()).resolves.toBe('idle');
    expect(transport.updateSet).not.toHaveBeenCalled();
    setUser(null);
    await expect(outbox.flush()).resolves.toBe('idle');
    setUser(5);
    await expect(outbox.flush()).resolves.toBe('delivered');
  });

  it('serialises concurrent flushes — no op is sent twice', async () => {
    const { outbox, transport } = setup();
    let release!: () => void;
    transport.updateSet.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ data: {}, stats: {} } as any))),
    );
    outbox.enqueue(1, { kind: 'set', setId: 10, body: {} });
    const first = outbox.flush();
    outbox.enqueue(1, { kind: 'set', setId: 11, body: {} });
    const second = outbox.flush();
    release();
    await Promise.all([first, second]);

    expect(transport.updateSet.mock.calls.map((c) => c[0])).toEqual([10, 11]);
    expect(outbox.hasPending()).toBe(false);
  });

  it('keeps the snapshot of the open session and clears only its own', () => {
    const { outbox } = setup();
    outbox.saveSnapshot(session({ id: 3 }));
    outbox.clearSnapshot(4);
    expect(outbox.readSnapshot()?.id).toBe(3);
    outbox.clearSnapshot(3);
    expect(outbox.readSnapshot()).toBeNull();
  });

  it('survives a restart — the queue lives in the store', async () => {
    const { outbox, kv, transport } = setup();
    outbox.enqueue(1, { kind: 'set', setId: 10, body: {} });

    const revived = createStrengthOutbox({
      store: {
        get: (k) => kv.get(k) ?? null,
        set: (k, v) => void kv.set(k, v),
        delete: (k) => void kv.delete(k),
      },
      transport,
      currentUserId: () => 5,
      emit: () => {},
    });
    expect(revived.pendingOps(1)).toHaveLength(1);
    await revived.flush();
    expect(transport.updateSet).toHaveBeenCalledWith(10, {});
  });
});
