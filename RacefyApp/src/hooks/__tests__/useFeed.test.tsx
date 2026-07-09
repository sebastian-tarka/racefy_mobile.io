import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useFeed } from '../useFeed';
import { api } from '../../services/api';

// Characterization test: pins useFeed's observable behaviour so the migration
// onto usePaginatedFetch is provably behaviour-preserving.
jest.mock('../../services/api', () => ({
  api: {
    getFeed: jest.fn(),
    createPost: jest.fn(),
    uploadPostMedia: jest.fn(),
    deletePost: jest.fn(),
    resharePost: jest.fn(),
    unresharePost: jest.fn(),
  },
}));
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn() },
}));

const getFeed = api.getFeed as jest.Mock;
const createPost = api.createPost as jest.Mock;
const deletePost = api.deletePost as jest.Mock;
const resharePost = api.resharePost as jest.Mock;

const post = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  is_liked: false,
  likes_count: 0,
  reshares_count: 0,
  is_reshared: false,
  activity: null,
  ...extra,
});
const pageResp = (data: unknown[], current: number, last: number) => ({
  data,
  meta: { current_page: current, last_page: last },
});

beforeEach(() => {
  getFeed.mockReset();
  createPost.mockReset();
  deletePost.mockReset();
  resharePost.mockReset();
});

describe('useFeed (characterization)', () => {
  it('does not auto-load on mount', () => {
    const { result } = renderHook(() => useFeed());
    expect(result.current.posts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(getFeed).not.toHaveBeenCalled();
  });

  it('refresh loads the first page', async () => {
    getFeed.mockResolvedValue(pageResp([post(1), post(2)], 1, 2));
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.posts.map((p: any) => p.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends the next page and de-dupes by id', async () => {
    getFeed
      .mockResolvedValueOnce(pageResp([post(1), post(2)], 1, 2))
      .mockResolvedValueOnce(pageResp([post(2), post(3)], 2, 2));
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.posts.map((p: any) => p.id)).toEqual([1, 2, 3]));
    expect(result.current.hasMore).toBe(false);
  });

  it('applyLikeChange updates the matching post locally', async () => {
    getFeed.mockResolvedValue(pageResp([post(1)], 1, 1));
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.applyLikeChange(1, true, 7);
    });

    expect(result.current.posts[0].is_liked).toBe(true);
    expect(result.current.posts[0].likes_count).toBe(7);
  });

  it('applyBoostChange updates the post activity', async () => {
    getFeed.mockResolvedValue(
      pageResp([post(1, { activity: { is_boosted: false, boosts_count: 1 } })], 1, 1),
    );
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    act(() => {
      result.current.applyBoostChange(1, true, 9);
    });

    expect((result.current.posts[0] as any).activity.is_boosted).toBe(true);
    expect((result.current.posts[0] as any).activity.boosts_count).toBe(9);
  });

  it('createPost prepends the new post', async () => {
    getFeed.mockResolvedValue(pageResp([post(1)], 1, 1));
    createPost.mockResolvedValue(post(99));
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.createPost('hi');
    });

    expect(result.current.posts.map((p: any) => p.id)).toEqual([99, 1]);
  });

  it('deletePost removes the post', async () => {
    getFeed.mockResolvedValue(pageResp([post(1), post(2)], 1, 1));
    deletePost.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.deletePost(1);
    });

    expect(result.current.posts.map((p: any) => p.id)).toEqual([2]);
  });

  it('resharePost prepends the reshare and bumps the original count', async () => {
    getFeed.mockResolvedValue(pageResp([post(1, { reshares_count: 2 })], 1, 1));
    resharePost.mockResolvedValue(post(100));
    const { result } = renderHook(() => useFeed());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.resharePost(1);
    });

    expect(result.current.posts[0].id).toBe(100);
    const original: any = result.current.posts.find((p: any) => p.id === 1);
    expect(original.reshares_count).toBe(3);
    expect(original.is_reshared).toBe(true);
  });
});
