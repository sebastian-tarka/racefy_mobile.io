import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDrafts } from '../useDrafts';
import { api } from '../../services/api';

// Characterization test pinning useDrafts' behaviour (incl. optimistic
// publish/delete with revert-on-error) before migrating onto usePaginatedFetch.
jest.mock('../../services/api', () => ({
  api: {
    getDrafts: jest.fn(),
    publishDraft: jest.fn(),
    deleteDraft: jest.fn(),
  },
}));
jest.mock('../../services/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn() },
}));

const getDrafts = api.getDrafts as jest.Mock;
const publishDraft = api.publishDraft as jest.Mock;
const deleteDraft = api.deleteDraft as jest.Mock;

const draft = (id: number) => ({ id });
const pageResp = (data: unknown[], current: number, last: number) => ({
  data,
  meta: { current_page: current, last_page: last },
});

beforeEach(() => {
  getDrafts.mockReset();
  publishDraft.mockReset();
  deleteDraft.mockReset();
});

describe('useDrafts (characterization)', () => {
  it('does not auto-load on mount', () => {
    const { result } = renderHook(() => useDrafts());
    expect(result.current.drafts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(getDrafts).not.toHaveBeenCalled();
  });

  it('refresh / fetchDrafts(true) loads the first page', async () => {
    getDrafts.mockResolvedValue(pageResp([draft(1), draft(2)], 1, 2));
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.fetchDrafts(true);
    });

    expect(result.current.drafts.map((d: any) => d.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends and de-dupes by id', async () => {
    getDrafts
      .mockResolvedValueOnce(pageResp([draft(1), draft(2)], 1, 2))
      .mockResolvedValueOnce(pageResp([draft(2), draft(3)], 2, 2));
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.drafts.map((d: any) => d.id)).toEqual([1, 2, 3]));
    expect(result.current.hasMore).toBe(false);
  });

  it('publishDraft optimistically removes the draft and returns the published post', async () => {
    getDrafts.mockResolvedValue(pageResp([draft(1), draft(2)], 1, 1));
    publishDraft.mockResolvedValue({ id: 1, published: true });
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.refresh();
    });
    let published: any;
    await act(async () => {
      published = await result.current.publishDraft(1);
    });

    expect(result.current.drafts.map((d: any) => d.id)).toEqual([2]);
    expect(published.id).toBe(1);
  });

  it('publishDraft reverts the list when the API fails', async () => {
    getDrafts.mockResolvedValue(pageResp([draft(1), draft(2)], 1, 1));
    publishDraft.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await expect(result.current.publishDraft(1)).rejects.toThrow('fail');
    });

    expect(result.current.drafts.map((d: any) => d.id)).toEqual([1, 2]);
  });

  it('deleteDraft optimistically removes the draft', async () => {
    getDrafts.mockResolvedValue(pageResp([draft(1), draft(2)], 1, 1));
    deleteDraft.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.deleteDraft(2);
    });

    expect(result.current.drafts.map((d: any) => d.id)).toEqual([1]);
  });

  it('deleteDraft reverts the list when the API fails', async () => {
    getDrafts.mockResolvedValue(pageResp([draft(1), draft(2)], 1, 1));
    deleteDraft.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useDrafts());

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await expect(result.current.deleteDraft(2)).rejects.toThrow('fail');
    });

    // Revert PREPENDS the draft (does not restore original position), so the
    // removed id=2 comes back at the front. Pinning this exact quirk.
    expect(result.current.drafts.map((d: any) => d.id)).toEqual([2, 1]);
  });
});
