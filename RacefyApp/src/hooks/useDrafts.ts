import { useCallback } from 'react';
import { api } from '../services/api';
import { usePaginatedFetch } from './usePaginatedFetch';
import type { DraftPost, Post } from '../types/api';

export function useDrafts() {
  const {
    data: drafts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    setData: setDrafts,
  } = usePaginatedFetch<DraftPost>((page) => api.getDrafts({ page, per_page: 15 }), {
    // The profile loads drafts when its tab is opened, not on mount.
    autoLoad: false,
    dedupeBy: (d) => d.id,
    errorMessage: 'Failed to load drafts',
  });

  // Kept for callers that ask for a reload explicitly; `refresh`/`loadMore`
  // are the direct route.
  const fetchDrafts = useCallback(
    (reset = false) => {
      if (reset) return refresh();
      loadMore();
      return Promise.resolve();
    },
    [refresh, loadMore],
  );

  const publishDraft = useCallback(
    async (postId: number): Promise<Post> => {
      // Optimistic update - remove from drafts immediately
      const draftToPublish = drafts.find((d) => d.id === postId);
      if (!draftToPublish) {
        throw new Error('Draft not found');
      }

      setDrafts((prev) => prev.filter((d) => d.id !== postId));

      try {
        const publishedPost = await api.publishDraft(postId);
        return publishedPost;
      } catch (err) {
        // Revert optimistic update on error
        setDrafts((prev) => [draftToPublish, ...prev]);
        throw err;
      }
    },
    [drafts, setDrafts],
  );

  const deleteDraft = useCallback(
    async (postId: number) => {
      // Optimistic update - remove from drafts immediately
      const draftToDelete = drafts.find((d) => d.id === postId);
      if (!draftToDelete) {
        throw new Error('Draft not found');
      }

      setDrafts((prev) => prev.filter((d) => d.id !== postId));

      try {
        await api.deleteDraft(postId);
      } catch (err) {
        // Revert optimistic update on error
        setDrafts((prev) => [draftToDelete, ...prev]);
        throw err;
      }
    },
    [drafts, setDrafts],
  );

  return {
    drafts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    fetchDrafts,
    refresh,
    loadMore,
    publishDraft,
    deleteDraft,
  };
}
