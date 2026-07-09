import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePaginatedFetch } from '../usePaginatedFetch';

jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn() },
}));

function page<T>(data: T[], current: number, last: number) {
  return { data, meta: { current_page: current, last_page: last } };
}

describe('usePaginatedFetch', () => {
  it('loads the first page and reports hasMore', async () => {
    const fetchPage = jest.fn(async () => page(['a', 'b'], 1, 3));
    const { result } = renderHook(() => usePaginatedFetch(fetchPage));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.page).toBe(1);
  });

  it('appends on loadMore and advances the page', async () => {
    const fetchPage = jest.fn(async (p: number) =>
      p === 1 ? page(['a'], 1, 2) : page(['b'], 2, 2),
    );
    const { result } = renderHook(() => usePaginatedFetch(fetchPage));

    await waitFor(() => expect(result.current.data).toEqual(['a']));
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.data).toEqual(['a', 'b']));
    expect(result.current.page).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch beyond the last page', async () => {
    const fetchPage = jest.fn(async () => page(['only'], 1, 1));
    const { result } = renderHook(() => usePaginatedFetch(fetchPage));

    await waitFor(() => expect(result.current.hasMore).toBe(false));
    await act(async () => {
      result.current.loadMore();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('de-dupes appended items by key', async () => {
    const fetchPage = jest.fn(async (p: number) =>
      p === 1 ? page([{ id: 1 }, { id: 2 }], 1, 2) : page([{ id: 2 }, { id: 3 }], 2, 2),
    );
    const { result } = renderHook(() =>
      usePaginatedFetch(fetchPage, { dedupeBy: (i: { id: number }) => i.id }),
    );

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]));
  });

  it('refresh replaces the list', async () => {
    let call = 0;
    const fetchPage = jest.fn(async () => {
      call += 1;
      return page([`v${call}`], 1, 1);
    });
    const { result } = renderHook(() => usePaginatedFetch(fetchPage));

    await waitFor(() => expect(result.current.data).toEqual(['v1']));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(['v2']);
  });

  it('surfaces errors', async () => {
    const fetchPage = jest.fn().mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => usePaginatedFetch(fetchPage, { errorMessage: 'fallback' }));

    await waitFor(() => expect(result.current.error).toBe('nope'));
  });

  it('does not fetch when disabled', async () => {
    const fetchPage = jest.fn();
    const { result } = renderHook(() => usePaginatedFetch(fetchPage, { enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('does not auto-load when autoLoad is false; refresh triggers it', async () => {
    const fetchPage = jest.fn(async () => page(['a'], 1, 1));
    const { result } = renderHook(() => usePaginatedFetch(fetchPage, { autoLoad: false }));

    // No fetch on mount, and isLoading starts false.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchPage).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(['a']);
  });
});
