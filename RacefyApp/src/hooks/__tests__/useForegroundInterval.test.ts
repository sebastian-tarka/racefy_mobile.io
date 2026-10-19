import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useForegroundInterval } from '../useForegroundInterval';

type Listener = (state: string) => void;

describe('useForegroundInterval', () => {
  let listener: Listener | null;
  let remove: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    listener = null;
    remove = jest.fn();
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, cb: Listener) => {
      listener = cb;
      return { remove };
    }) as any);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ticks while in the foreground', () => {
    const cb = jest.fn();
    renderHook(() => useForegroundInterval(cb, 1000));
    jest.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('stops in the background and refreshes at once on return', () => {
    const cb = jest.fn();
    renderHook(() => useForegroundInterval(cb, 1000));

    listener!('background');
    jest.advanceTimersByTime(60_000);
    expect(cb).not.toHaveBeenCalled();

    listener!('active');
    expect(cb).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('does not start when mounted in the background', () => {
    Object.defineProperty(AppState, 'currentState', { value: 'background', configurable: true });
    const cb = jest.fn();
    renderHook(() => useForegroundInterval(cb, 1000));
    jest.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('is off for a null interval and cleans up on unmount', () => {
    const cb = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ ms }: { ms: number | null }) => useForegroundInterval(cb, ms),
      { initialProps: { ms: null as number | null } },
    );
    jest.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();

    rerender({ ms: 1000 });
    jest.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    unmount();
    jest.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalled();
  });

  it('always calls the latest callback', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ cb }) => useForegroundInterval(cb, 1000), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    jest.advanceTimersByTime(1000);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
