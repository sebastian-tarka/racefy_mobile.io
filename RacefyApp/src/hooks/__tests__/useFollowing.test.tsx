import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFollowing } from '../useFollowing';
import { api } from '../../services/api';

// Mutable auth state so each test can pick the authenticated/anonymous case.
let mockAuthState: { user: { id: number } | null; isAuthenticated: boolean } = {
  user: { id: 1 },
  isAuthenticated: true,
};

jest.mock('../../services/api', () => ({
  api: { getFollowing: jest.fn() },
}));
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn() },
}));
jest.mock('../useAuth', () => ({
  useAuth: () => mockAuthState,
}));

const getFollowing = api.getFollowing as jest.Mock;
const user = (id: number) => ({ id });

beforeEach(() => {
  getFollowing.mockReset();
  mockAuthState = { user: { id: 1 }, isAuthenticated: true };
});

describe('useFollowing (characterization)', () => {
  it('auto-loads the following list when authenticated', async () => {
    getFollowing.mockResolvedValue([user(1), user(2)]);
    const { result } = renderHook(() => useFollowing());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getFollowing).toHaveBeenCalledWith(1);
    expect(result.current.following.map((u: any) => u.id)).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when unauthenticated', async () => {
    mockAuthState = { user: null, isAuthenticated: false };
    const { result } = renderHook(() => useFollowing());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getFollowing).not.toHaveBeenCalled();
    expect(result.current.following).toEqual([]);
  });

  it('shows a fixed friendly error message on failure', async () => {
    getFollowing.mockRejectedValue(new Error('raw network error'));
    const { result } = renderHook(() => useFollowing());

    await waitFor(() => expect(result.current.error).toBe('Failed to load following list'));
    expect(result.current.following).toEqual([]);
  });

  it('refetch re-fetches the list', async () => {
    getFollowing.mockResolvedValueOnce([user(1)]).mockResolvedValueOnce([user(1), user(2)]);
    const { result } = renderHook(() => useFollowing());

    await waitFor(() => expect(result.current.following).toHaveLength(1));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.following.map((u: any) => u.id)).toEqual([1, 2]);
  });
});