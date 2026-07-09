import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useConversations } from '../useConversations';
import { api } from '../../services/api';

// Characterization test pinning useConversations' behaviour before migrating it
// onto usePaginatedFetch.
jest.mock('../../services/api', () => ({
  api: {
    getConversations: jest.fn(),
    deleteConversation: jest.fn(),
    startConversation: jest.fn(),
  },
}));
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn() },
}));

const getConversations = api.getConversations as jest.Mock;
const deleteConversation = api.deleteConversation as jest.Mock;
const startConversation = api.startConversation as jest.Mock;

const conv = (id: number) => ({ id });
const pageResp = (data: unknown[], current: number, last: number) => ({
  data,
  meta: { current_page: current, last_page: last },
});

beforeEach(() => {
  getConversations.mockReset();
  deleteConversation.mockReset();
  startConversation.mockReset();
});

describe('useConversations (characterization)', () => {
  it('does not auto-load on mount', () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(getConversations).not.toHaveBeenCalled();
  });

  it('refresh loads the first page', async () => {
    getConversations.mockResolvedValue(pageResp([conv(1), conv(2)], 1, 2));
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.conversations.map((c: any) => c.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends and de-dupes by id', async () => {
    getConversations
      .mockResolvedValueOnce(pageResp([conv(1), conv(2)], 1, 2))
      .mockResolvedValueOnce(pageResp([conv(2), conv(3)], 2, 2));
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() =>
      expect(result.current.conversations.map((c: any) => c.id)).toEqual([1, 2, 3]),
    );
    expect(result.current.hasMore).toBe(false);
  });

  it('deleteConversation removes it from the list', async () => {
    getConversations.mockResolvedValue(pageResp([conv(1), conv(2)], 1, 1));
    deleteConversation.mockResolvedValue(undefined);
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.deleteConversation(1);
    });

    expect(result.current.conversations.map((c: any) => c.id)).toEqual([2]);
  });

  it('startConversation prepends a new conversation and returns it', async () => {
    getConversations.mockResolvedValue(pageResp([conv(1)], 1, 1));
    startConversation.mockResolvedValue({ data: conv(5) });
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.refresh();
    });
    let returned: any;
    await act(async () => {
      returned = await result.current.startConversation(99);
    });

    expect(result.current.conversations.map((c: any) => c.id)).toEqual([5, 1]);
    expect(returned.id).toBe(5);
  });

  it('startConversation does not duplicate an existing conversation', async () => {
    getConversations.mockResolvedValue(pageResp([conv(1)], 1, 1));
    startConversation.mockResolvedValue({ data: conv(1) });
    const { result } = renderHook(() => useConversations());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.startConversation(1);
    });

    expect(result.current.conversations.map((c: any) => c.id)).toEqual([1]);
  });
});
