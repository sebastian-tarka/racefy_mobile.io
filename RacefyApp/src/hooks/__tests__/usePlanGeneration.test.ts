import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import type { PlanGenerationStatus } from '../../types/api';
import { generationSignature, isGenerationPending, usePlanGeneration } from '../usePlanGeneration';

jest.mock('../../services/api', () => ({
  api: { getPlanGeneration: jest.fn(), retryPlanAi: jest.fn() },
}));
jest.mock('../../services/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const { api } = jest.requireMock('../../services/api') as {
  api: { getPlanGeneration: jest.Mock; retryPlanAi: jest.Mock };
};

const status = (
  overrides: Partial<PlanGenerationStatus> = {},
  week: Partial<PlanGenerationStatus['weeks'][number]> = {},
): PlanGenerationStatus => ({
  ai_status: 'ready',
  coach_note_ready: false,
  hints: { total: 2, pending: 0, ready: 0, failed: 0, none: 2 },
  weeks: [
    { id: 10, week_number: 1, hint_status: 'none', hint_language: null, ...week },
    { id: 11, week_number: 2, hint_status: 'none', hint_language: null },
  ],
  ...overrides,
});

const pendingStatus = status(
  { ai_status: 'pending', hints: { total: 2, pending: 1, ready: 0, failed: 0, none: 1 } },
  { hint_status: 'pending' },
);
const readyStatus = status(
  { hints: { total: 2, pending: 0, ready: 1, failed: 0, none: 1 } },
  { hint_status: 'ready', hint_language: 'en' },
);

describe('usePlanGeneration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((() => ({ remove: jest.fn() })) as any);
    api.getPlanGeneration.mockReset();
    api.retryPlanAi.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('knows a pending plan from the program status or any pending hint', () => {
    expect(isGenerationPending(null)).toBe(false);
    expect(isGenerationPending(status())).toBe(false);
    expect(isGenerationPending(status({ ai_status: 'pending' }))).toBe(true);
    expect(
      isGenerationPending(
        status({ hints: { total: 2, pending: 1, ready: 0, failed: 0, none: 1 } }),
      ),
    ).toBe(true);
  });

  it('changes its signature when a hint lands or a translation arrives', () => {
    const base = generationSignature(readyStatus);
    expect(generationSignature(readyStatus)).toBe(base);
    const translated: PlanGenerationStatus = {
      ...readyStatus,
      weeks: [{ ...readyStatus.weeks[0], hint_language: 'pl' }, readyStatus.weeks[1]],
    };
    expect(generationSignature(translated)).not.toBe(base);
    expect(generationSignature(pendingStatus)).not.toBe(base);
  });

  it('reads once, polls only while pending, and reports the change when the hint lands', async () => {
    api.getPlanGeneration.mockResolvedValueOnce(pendingStatus).mockResolvedValue(readyStatus);
    const onChanged = jest.fn();

    const { result } = renderHook(() => usePlanGeneration(7, { onChanged }));

    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(api.getPlanGeneration).toHaveBeenCalledTimes(1);
    expect(onChanged).not.toHaveBeenCalled(); // the first read is not a change

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(api.getPlanGeneration).toHaveBeenCalledTimes(2);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith(readyStatus);

    // Settled: no more polling.
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(api.getPlanGeneration).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a program and tolerates a failing read', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => usePlanGeneration(id),
      {
        initialProps: { id: null as number | null },
      },
    );
    await act(async () => {});
    expect(api.getPlanGeneration).not.toHaveBeenCalled();
    expect(result.current.status).toBeNull();

    api.getPlanGeneration.mockRejectedValue(new Error('offline'));
    rerender({ id: 3 });
    await act(async () => {});
    expect(api.getPlanGeneration).toHaveBeenCalledWith(3);
    expect(result.current.status).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('retry takes the server answer as the new status and reports it', async () => {
    const failed = status({ ai_status: 'failed' }, { hint_status: 'failed' });
    api.getPlanGeneration.mockResolvedValue(failed);
    api.retryPlanAi.mockResolvedValue(pendingStatus);
    const onChanged = jest.fn();

    const { result } = renderHook(() => usePlanGeneration(7, { onChanged }));
    await waitFor(() => expect(result.current.status).toEqual(failed));

    await act(async () => {
      await result.current.retry();
    });
    expect(api.retryPlanAi).toHaveBeenCalledWith(7);
    expect(result.current.pending).toBe(true);
    expect(onChanged).toHaveBeenCalledWith(pendingStatus);
  });
});
