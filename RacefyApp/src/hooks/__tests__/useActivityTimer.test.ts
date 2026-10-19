import { act, renderHook } from '@testing-library/react-native';
import { msUntilNextSecond, useActivityTimer } from '../useActivityTimer';
import type { Activity } from '../../types/api';

jest.mock('../../services/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const START = new Date('2026-10-19T08:00:00.000Z').getTime();

const activity = (over: Partial<Activity> = {}) =>
  ({
    id: 1,
    started_at: new Date(START).toISOString(),
    total_paused_duration: 0,
    duration: 0,
    ...over,
  }) as Activity;

describe('msUntilNextSecond', () => {
  it('waits until just past the next whole second', () => {
    expect(msUntilNextSecond(0)).toBe(1005);
    expect(msUntilNextSecond(250)).toBe(755);
    expect(msUntilNextSecond(999)).toBe(6);
    expect(msUntilNextSecond(4_000)).toBe(1005);
  });

  it('handles a start time slightly in the future (negative elapsed)', () => {
    expect(msUntilNextSecond(-200)).toBe(205);
  });
});

describe('useActivityTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START + 400);
  });
  afterEach(() => jest.useRealTimers());

  it('shows elapsed whole seconds immediately and on every second flip', () => {
    const a = activity();
    const { result } = renderHook(() => useActivityTimer(a, true, false));
    expect(result.current.localDuration).toBe(0);

    // The tick lands 5 ms past the flip, so a hair after 1.0 s elapsed.
    act(() => jest.advanceTimersByTime(610));
    expect(result.current.localDuration).toBe(1);

    act(() => jest.advanceTimersByTime(59_000));
    expect(result.current.localDuration).toBe(60);
  });

  it('wakes up once per second, not ten times', () => {
    const a = activity();
    renderHook(() => useActivityTimer(a, true, false));
    const spy = jest.spyOn(global, 'setTimeout');

    act(() => jest.advanceTimersByTime(10_000));
    expect(spy.mock.calls.length).toBeLessThanOrEqual(11);
    spy.mockRestore();
  });

  it('freezes on pause and keeps counting from there after resume', () => {
    const a = activity();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useActivityTimer(a, true, paused),
      { initialProps: { paused: false } },
    );

    act(() => jest.advanceTimersByTime(9_610)); // just past 10 s
    expect(result.current.localDuration).toBe(10);

    rerender({ paused: true });
    act(() => jest.advanceTimersByTime(30_000));
    expect(result.current.localDuration).toBe(10);

    rerender({ paused: false });
    act(() => jest.advanceTimersByTime(5_000));
    expect(result.current.localDuration).toBe(15);
  });
});
