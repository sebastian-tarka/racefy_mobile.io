import type {
  WorkoutSession,
  WorkoutSessionCompleteInput,
  WorkoutSessionCompleteResponse,
  WorkoutSessionSetResponse,
  WorkoutSessionSetUpdate,
} from '../../types/workouts';
import { getErrorMessage, getErrorStatus } from '../../utils/errors';

/**
 * Outbox for a strength session — what lets the athlete keep logging sets in a
 * basement gym with no signal.
 *
 * Every change to a set (start, done, reopen, rest length, delete) and the final
 * "complete" are written here first, then sent in order. A request that gets no
 * answer (or a 5xx / 429) leaves the op at the head of the queue and the run
 * stops; the next trigger (another tap, network regained, app foregrounded)
 * picks it up. A 4xx is the server saying no, so that op is dropped and reported
 * — the screen reloads the truth.
 *
 * The set PUT carries explicit `started_at` / `completed_at` / `rest_started_at`,
 * so a set sent an hour late lands with the times it was really done.
 *
 * Next to the queue sits a snapshot of the open session (with every optimistic
 * change applied): it is what the session screen shows when it is reopened —
 * after a kill, or after leaving the screen — while the server cannot be reached
 * or has not caught up with the queue yet.
 */

export type StrengthOp =
  | { kind: 'set'; setId: number; body: WorkoutSessionSetUpdate }
  | { kind: 'delete'; setId: number }
  | {
      kind: 'complete';
      /** `completed_at` is the tap on "Finish", not the moment the queue drained. */
      input: WorkoutSessionCompleteInput & { completed_at: string };
    };

interface SessionQueue {
  /** Owner — a queue is never sent from another account. */
  userId: number | null;
  ops: StrengthOp[];
}

type OutboxState = Record<string, SessionQueue>;

export interface KvStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

export interface StrengthTransport {
  updateSet: (setId: number, body: WorkoutSessionSetUpdate) => Promise<WorkoutSessionSetResponse>;
  deleteSet: (setId: number) => Promise<void>;
  complete: (
    sessionId: number,
    input: WorkoutSessionCompleteInput,
  ) => Promise<WorkoutSessionCompleteResponse>;
  getSession: (sessionId: number) => Promise<WorkoutSession>;
}

export type OutboxEvent =
  | { type: 'completed'; sessionId: number; session: WorkoutSession; activityId: number | null }
  | { type: 'rejected'; sessionId: number; op: StrengthOp; message: string }
  | { type: 'changed' };

export type FlushResult = 'idle' | 'delivered' | 'offline' | 'auth_required';

export interface StrengthOutboxDeps {
  store: KvStore;
  transport: StrengthTransport;
  currentUserId: () => number | null;
  emit: (event: OutboxEvent) => void;
}

const OUTBOX_KEY = 'strength:outbox';
const SNAPSHOT_KEY = 'strength:snapshot';

/** No answer, a server error or rate limiting: the op is fine, the moment is not. */
function isTransient(status: number | undefined): boolean {
  return status == null || status >= 500 || status === 429;
}

export function createStrengthOutbox(deps: StrengthOutboxDeps) {
  let running: Promise<FlushResult> | null = null;
  let again = false;

  const read = (): OutboxState => {
    const raw = deps.store.get(OUTBOX_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as OutboxState;
    } catch {
      return {};
    }
  };

  const write = (state: OutboxState) => {
    if (Object.keys(state).length === 0) deps.store.delete(OUTBOX_KEY);
    else deps.store.set(OUTBOX_KEY, JSON.stringify(state));
  };

  /** Drop the head op of a session (after it was delivered or refused). */
  const shift = (sessionId: number) => {
    const state = read();
    const queue = state[sessionId];
    if (!queue) return;
    queue.ops.shift();
    if (queue.ops.length === 0) delete state[sessionId];
    write(state);
    deps.emit({ type: 'changed' });
  };

  const enqueue = (sessionId: number, op: StrengthOp) => {
    const state = read();
    const queue = state[sessionId] ?? { userId: deps.currentUserId(), ops: [] };
    queue.ops.push(op);
    state[sessionId] = queue;
    write(state);
    deps.emit({ type: 'changed' });
  };

  const pendingOps = (sessionId: number): StrengthOp[] => read()[sessionId]?.ops ?? [];

  const hasPending = (sessionId?: number): boolean => {
    const state = read();
    return sessionId == null ? Object.keys(state).length > 0 : !!state[sessionId]?.ops.length;
  };

  const hasPendingComplete = (sessionId: number): boolean =>
    pendingOps(sessionId).some((op) => op.kind === 'complete');

  /**
   * One op. 'sent' also covers a refusal — the op is gone either way; what the
   * caller should announce comes back as `event`, emitted once the op is off
   * the queue so listeners see the queue as it now is.
   */
  const sendOp = async (
    sessionId: number,
    op: StrengthOp,
  ): Promise<
    { outcome: 'sent'; event?: OutboxEvent } | { outcome: 'offline' | 'auth_required' }
  > => {
    try {
      if (op.kind === 'set') {
        // The answer only echoes what the phone already shows (stats are counted
        // locally), and a later queued change to the same set would be undone by it.
        await deps.transport.updateSet(op.setId, op.body);
        return { outcome: 'sent' };
      }
      if (op.kind === 'delete') {
        await deps.transport.deleteSet(op.setId);
        return { outcome: 'sent' };
      }
      const response = await deps.transport.complete(sessionId, op.input);
      return {
        outcome: 'sent',
        event: {
          type: 'completed',
          sessionId,
          session: response.data,
          activityId: response.activity_id ?? response.data.activity_id,
        },
      };
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 401) return { outcome: 'auth_required' };
      if (isTransient(status)) return { outcome: 'offline' };
      // A delete of a set that is already gone did what it was asked to.
      if (op.kind === 'delete' && status === 404) return { outcome: 'sent' };
      // "Not in progress" on complete: an earlier attempt may have landed with the
      // answer lost on the way back. If the server has it completed, it is done.
      if (op.kind === 'complete' && status === 409) {
        try {
          const fresh = await deps.transport.getSession(sessionId);
          if (fresh.status === 'completed') {
            return {
              outcome: 'sent',
              event: {
                type: 'completed',
                sessionId,
                session: fresh,
                activityId: fresh.activity_id,
              },
            };
          }
        } catch (lookupError) {
          if (isTransient(getErrorStatus(lookupError))) return { outcome: 'offline' };
        }
      }
      return {
        outcome: 'sent',
        event: { type: 'rejected', sessionId, op, message: getErrorMessage(error) },
      };
    }
  };

  const drain = async (): Promise<FlushResult> => {
    let delivered = false;
    const userId = deps.currentUserId();
    if (userId == null) return 'idle';
    for (const key of Object.keys(read())) {
      const sessionId = Number(key);
      for (;;) {
        const queue = read()[key];
        if (!queue || queue.ops.length === 0) break;
        if (queue.userId != null && queue.userId !== userId) break;
        const result = await sendOp(sessionId, queue.ops[0]);
        if (result.outcome !== 'sent') return result.outcome;
        shift(sessionId);
        if (result.event?.type === 'completed') clearSnapshot(sessionId);
        if (result.event) deps.emit(result.event);
        delivered = true;
      }
    }
    return delivered ? 'delivered' : 'idle';
  };

  /**
   * Send what is queued. Runs are serialised: a call during a run makes that run
   * go round once more instead of starting a second one, so ops are never sent
   * twice or out of order.
   */
  const flush = (): Promise<FlushResult> => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      let result: FlushResult;
      do {
        again = false;
        result = await drain();
      } while (again && result !== 'offline' && result !== 'auth_required');
      return result;
    })().finally(() => {
      running = null;
    });
    return running;
  };

  const readSnapshot = (): WorkoutSession | null => {
    const raw = deps.store.get(SNAPSHOT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as WorkoutSession;
    } catch {
      return null;
    }
  };

  const saveSnapshot = (session: WorkoutSession) =>
    deps.store.set(SNAPSHOT_KEY, JSON.stringify(session));

  const clearSnapshot = (sessionId: number) => {
    if (readSnapshot()?.id === sessionId) deps.store.delete(SNAPSHOT_KEY);
  };

  return {
    enqueue,
    flush,
    hasPending,
    hasPendingComplete,
    pendingOps,
    readSnapshot,
    saveSnapshot,
    clearSnapshot,
  };
}

export type StrengthOutbox = ReturnType<typeof createStrengthOutbox>;
