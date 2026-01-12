import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { DraftPost, Post } from '../types/api';

export function useDrafts() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = useCallback(
    async (reset = false) => {
      if (isLoading) return;

      if (reset) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const currentPage = reset ? 1 : page;
        const response = await api.getDrafts({
          page: currentPage,
          per_page: 15,
        });

        setDrafts((prev) => {
          if (reset) return response.data;
          // Deduplicate by draft ID when loading more
          const existingIds = new Set(prev.map((d) => d.id));
          const newDrafts = response.data.filter((d) => !existingIds.has(d.id));
          return [...prev, ...newDrafts];
        });
        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
        setError('Failed to load drafts');
        logger.error('general', 'Error loading drafts', { error: err });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, isLoading]
  );

  const refresh = useCallback(() => fetchDrafts(true), [fetchDrafts]);

  const loadMore = useCallback(
    () => hasMore && !isLoading && fetchDrafts(false),
    [hasMore, isLoading, fetchDrafts]
  );

  const publishDraft = useCallback(async (postId: number): Promise<Post> => {
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
  }, [drafts]);

  const deleteDraft = useCallback(async (postId: number) => {
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
  }, [drafts]);

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
