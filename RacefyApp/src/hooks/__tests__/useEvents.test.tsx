import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useEvents } from '../useEvents';
import { api } from '../../services/api';

// Characterization test: pins useEvents' observable behaviour so the migration
// onto usePaginatedFetch is provably behaviour-preserving.
jest.mock('../../services/api', () => ({
  api: {
    getEvents: jest.fn(),
    registerForEvent: jest.fn(),
    cancelEventRegistration: jest.fn(),
  },
}));

// usePaginatedFetch (used after the migration) imports the logger, which pulls
// in AsyncStorage — mock it so the test runs in a plain node environment.
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn() },
}));

const getEvents = api.getEvents as jest.Mock;
const registerForEvent = api.registerForEvent as jest.Mock;
const cancelEventRegistration = api.cancelEventRegistration as jest.Mock;

const ev = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  participants_count: 0,
  is_registered: false,
  ...extra,
});
const pageResp = (data: unknown[], current: number, last: number) => ({
  data,
  meta: { current_page: current, last_page: last },
});

beforeEach(() => {
  getEvents.mockReset();
  registerForEvent.mockReset();
  cancelEventRegistration.mockReset();
});

describe('useEvents (characterization)', () => {
  it('does not auto-load on mount', () => {
    const { result } = renderHook(() => useEvents());
    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(getEvents).not.toHaveBeenCalled();
  });

  it('refresh loads the first page', async () => {
    getEvents.mockResolvedValue(pageResp([ev(1), ev(2)], 1, 2));
    const { result } = renderHook(() => useEvents());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.events.map((e: any) => e.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends the next page and de-dupes by id', async () => {
    getEvents
      .mockResolvedValueOnce(pageResp([ev(1), ev(2)], 1, 2))
      .mockResolvedValueOnce(pageResp([ev(2), ev(3)], 2, 2));
    const { result } = renderHook(() => useEvents());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.events.map((e: any) => e.id)).toEqual([1, 2, 3]));
    expect(result.current.hasMore).toBe(false);
  });

  it('changeFilter clears the list and records the new filter', async () => {
    getEvents.mockResolvedValue(pageResp([ev(1)], 1, 1));
    const { result } = renderHook(() => useEvents());

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.events).toHaveLength(1);

    act(() => {
      result.current.changeFilter('ongoing');
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.statusFilter).toBe('ongoing');
  });

  it('registerForEvent optimistically updates the matching event', async () => {
    getEvents.mockResolvedValue(pageResp([ev(1, { participants_count: 5 })], 1, 1));
    registerForEvent.mockResolvedValue(undefined);
    const { result } = renderHook(() => useEvents());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.registerForEvent(1);
    });

    expect(result.current.events[0].is_registered).toBe(true);
    expect(result.current.events[0].participants_count).toBe(6);
  });

  it('cancelRegistration optimistically updates the matching event', async () => {
    getEvents.mockResolvedValue(
      pageResp([ev(1, { participants_count: 5, is_registered: true })], 1, 1),
    );
    cancelEventRegistration.mockResolvedValue(undefined);
    const { result } = renderHook(() => useEvents());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.cancelRegistration(1);
    });

    expect(result.current.events[0].is_registered).toBe(false);
    expect(result.current.events[0].participants_count).toBe(4);
  });
});