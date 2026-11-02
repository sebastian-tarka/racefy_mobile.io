import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { PlanGenerationStatus } from '../types/api';
import { useForegroundInterval } from './useForegroundInterval';

const PLAN_GENERATION_POLL_MS = 5000;

/**
 * The server already turns a `pending` older than 15 min into `failed`; this
 * is the client's own cap on top, so a poll can never run for good.
 */
const PLAN_GENERATION_MAX_WAIT_MS = 20 * 60_000;

export function isGenerationPending(status: PlanGenerationStatus | null): boolean {
  return !!status && (status.ai_status === 'pending' || status.hints.pending > 0);
}

/** Everything the weeks list renders from — when it changes, the weeks must be re-read. */
export function generationSignature(status: PlanGenerationStatus): string {
  return [
    status.ai_status,
    status.coach_note_ready ? 1 : 0,
    ...status.weeks.map((w) => `${w.id}:${w.hint_status}:${w.hint_language ?? ''}`),
  ].join('|');
}

interface Options {
  /** Something a week shows changed (hint written, translation landed, failure). */
  onChanged?: (status: PlanGenerationStatus) => void;
}

export interface PlanGeneration {
  status: PlanGenerationStatus | null;
  /** A job is still writing something for this plan. */
  pending: boolean;
  /** Waited past the cap — the UI says so and stops polling. */
  timedOut: boolean;
  refresh: () => Promise<PlanGenerationStatus | null>;
  /** Ask again for a failed first-week hint / coach note. */
  retry: () => Promise<void>;
}

/**
 * What the AI is still preparing for a plan (`GET /training/programs/{id}/generation`).
 *
 * The plan's hint, translation and coach note are queue jobs since 2026-11:
 * `initialize` returns at once and this hook follows the rest. It polls every
 * 5 s only while something is pending, only in the foreground (an immediate
 * read on return), and never longer than the cap. `onChanged` fires when a
 * week's visible state moved, so the screen re-reads the weeks exactly then.
 */
export function usePlanGeneration(
  programId: number | null,
  { onChanged }: Options = {},
): PlanGeneration {
  const [status, setStatus] = useState<PlanGenerationStatus | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const signatureRef = useRef<string | null>(null);
  const waitingSinceRef = useRef<number | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const apply = useCallback((next: PlanGenerationStatus, notify: boolean) => {
    const signature = generationSignature(next);
    const previous = signatureRef.current;
    signatureRef.current = signature;
    setStatus(next);

    if (isGenerationPending(next)) {
      waitingSinceRef.current ??= Date.now();
      if (Date.now() - waitingSinceRef.current > PLAN_GENERATION_MAX_WAIT_MS) {
        setTimedOut(true);
      }
    } else {
      waitingSinceRef.current = null;
      setTimedOut(false);
    }

    if (notify && previous !== null && previous !== signature) {
      onChangedRef.current?.(next);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!programId) return null;
    try {
      const next = await api.getPlanGeneration(programId);
      apply(next, true);
      return next;
    } catch (error) {
      logger.warn('training', 'Plan generation status failed', { programId, error });
      return null;
    }
  }, [programId, apply]);

  useEffect(() => {
    signatureRef.current = null;
    waitingSinceRef.current = null;
    setStatus(null);
    setTimedOut(false);
    void refresh();
  }, [refresh]);

  const pending = isGenerationPending(status);
  useForegroundInterval(
    () => {
      void refresh();
    },
    pending && !timedOut ? PLAN_GENERATION_POLL_MS : null,
  );

  const retry = useCallback(async () => {
    if (!programId) return;
    const next = await api.retryPlanAi(programId);
    waitingSinceRef.current = null;
    setTimedOut(false);
    apply(next, true);
  }, [programId, apply]);

  return { status, pending, timedOut, refresh, retry };
}
