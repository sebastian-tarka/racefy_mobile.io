import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFetch } from '../useFetch';

// Avoid loading the real logger (drags in AsyncStorage / expo modules).
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe('useFetch', () => {
  it('loads and exposes data, clearing isLoading', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 42 });
    const { result } = renderHook(() => useFetch(fetcher));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not call the fetcher when disabled', async () => {
    const fetcher = jest.fn().mockResolvedValue('x');
    const { result } = renderHook(() => useFetch(fetcher, { enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('surfaces the error message and keeps data null on failure', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFetch(fetcher, { errorMessage: 'fallback' }));

    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to errorMessage when the error has no message', async () => {
    const fetcher = jest.fn().mockRejectedValue('plain string');
    const { result } = renderHook(() => useFetch(fetcher, { errorMessage: 'fallback' }));

    await waitFor(() => expect(result.current.error).toBe('fallback'));
  });

  it('refetch re-runs the fetcher', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce('a').mockResolvedValueOnce('b');
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.data).toBe('a'));
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toBe('b');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refetches when a dep changes', async () => {
    const fetcher = jest.fn((id: number) => Promise.resolve(`v${id}`));
    const { result, rerender } = renderHook(({ id }) => useFetch(() => fetcher(id), { deps: [id] }), {
      initialProps: { id: 1 },
    });

    await waitFor(() => expect(result.current.data).toBe('v1'));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('v2'));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale response that resolves after a newer request', async () => {
    let resolveFirst: (v: string) => void = () => {};
    const fetcher = jest
      .fn()
      .mockImplementationOnce(() => new Promise<string>((r) => (resolveFirst = r))) // id=1 hangs
      .mockImplementationOnce(() => Promise.resolve('second')); // id=2 resolves

    const { result, rerender } = renderHook(
      ({ id }) => useFetch(() => fetcher(id), { deps: [id] }),
      { initialProps: { id: 1 } },
    );

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe('second'));

    // The stale first request now resolves — it must NOT overwrite the newer data.
    await act(async () => {
      resolveFirst('first');
    });
    expect(result.current.data).toBe('second');
  });
});