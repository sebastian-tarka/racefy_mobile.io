import { act, renderHook } from '@testing-library/react-native';
import { useAutoAdvance } from '../useAutoAdvance';

describe('useAutoAdvance', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = (overrides: Partial<Parameters<typeof useAutoAdvance>[0]> = {}) => {
    const onAdvance = jest.fn();
    const props = { count: 3, index: 0, enabled: true, intervalMs: 1000, onAdvance, ...overrides };
    const view = renderHook((p: typeof props) => useAutoAdvance(p), { initialProps: props });
    return { onAdvance, view, props };
  };

  it('advances to the next slide after the dwell time', () => {
    const { onAdvance } = setup();
    act(() => void jest.advanceTimersByTime(1000));
    expect(onAdvance).toHaveBeenCalledWith(1);
  });

  it('wraps from the last slide back to the first', () => {
    const { onAdvance } = setup({ index: 2 });
    act(() => void jest.advanceTimersByTime(1000));
    expect(onAdvance).toHaveBeenCalledWith(0);
  });

  it('does nothing with a single slide', () => {
    const { onAdvance } = setup({ count: 1 });
    act(() => void jest.advanceTimersByTime(5000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('does nothing while disabled — a playing video, an unfocused screen', () => {
    const { onAdvance } = setup({ enabled: false });
    act(() => void jest.advanceTimersByTime(5000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('stops once paused by a finger on the carousel', () => {
    const { onAdvance, view } = setup();
    act(() => view.result.current.pause());
    act(() => void jest.advanceTimersByTime(5000));
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('gives the slide a full dwell after the drag ends, not the leftover', () => {
    const { onAdvance, view } = setup();
    act(() => void jest.advanceTimersByTime(900));
    act(() => view.result.current.pause());
    act(() => view.result.current.resume());
    act(() => void jest.advanceTimersByTime(900));
    expect(onAdvance).not.toHaveBeenCalled();
    act(() => void jest.advanceTimersByTime(100));
    expect(onAdvance).toHaveBeenCalledWith(1);
  });

  it('restarts the clock from the slide the user swiped to', () => {
    const { onAdvance, view, props } = setup();
    act(() => void jest.advanceTimersByTime(600));
    act(() => view.rerender({ ...props, index: 2 }));
    act(() => void jest.advanceTimersByTime(999));
    expect(onAdvance).not.toHaveBeenCalled();
    act(() => void jest.advanceTimersByTime(1));
    expect(onAdvance).toHaveBeenCalledWith(0);
  });
});
