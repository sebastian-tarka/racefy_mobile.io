import { act, renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useFadeToast } from '../useFadeToast';

describe('useFadeToast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    // Flush any pending fade animation so it doesn't leak into the next test.
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('starts hidden with no payload', () => {
    const { result } = renderHook(() => useFadeToast<boolean>());
    expect(result.current.visible).toBe(false);
    expect(result.current.payload).toBeUndefined();
    expect(result.current.opacity).toBeInstanceOf(Animated.Value);
  });

  it('show() makes it visible and stores the payload', () => {
    const { result } = renderHook(() => useFadeToast<boolean>());
    act(() => result.current.show(true));
    expect(result.current.visible).toBe(true);
    expect(result.current.payload).toBe(true);
  });

  it('keeps a stable show reference and opacity across renders', () => {
    const { result, rerender } = renderHook(() => useFadeToast<boolean>());
    const firstShow = result.current.show;
    const firstOpacity = result.current.opacity;
    rerender({});
    expect(result.current.show).toBe(firstShow);
    expect(result.current.opacity).toBe(firstOpacity);
  });

  it('carries the latest payload on repeated shows', () => {
    const { result } = renderHook(() => useFadeToast<boolean>());
    act(() => result.current.show(true));
    expect(result.current.payload).toBe(true);
    act(() => result.current.show(false));
    expect(result.current.payload).toBe(false);
  });

  it('hides itself again once the fade cycle completes', () => {
    const { result } = renderHook(() => useFadeToast<boolean>({ fadeDuration: 10, holdDuration: 50 }));
    act(() => result.current.show(true));
    expect(result.current.visible).toBe(true);
    act(() => jest.runAllTimers());
    expect(result.current.visible).toBe(false);
  });
});