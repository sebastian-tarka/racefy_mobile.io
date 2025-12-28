import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type { Conversation } from '../types/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(
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
        const response = await api.getConversations(currentPage);

        setConversations((prev) => {
          if (reset) return response.data;
          // Deduplicate by ID when loading more
          const existingIds = new Set(prev.map((c) => c.id));
          const newConversations = response.data.filter(
            (c) => !existingIds.has(c.id)
          );
          return [...prev, ...newConversations];
        });
        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, isLoading]
  );

  const refresh = useCallback(() => fetchConversations(true), [fetchConversations]);

  const loadMore = useCallback(
    () => hasMore && !isLoading && fetchConversations(false),
    [hasMore, isLoading, fetchConversations]
  );

  const deleteConversation = useCallback(async (conversationId: number) => {
    try {
      await api.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  }, []);

  const startConversation = useCallback(async (userId: number) => {
    try {
      const response = await api.startConversation(userId);
      // Add to beginning of list if not already present
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === response.data.id);
        if (exists) return prev;
        return [response.data, ...prev];
      });
      return response.data;
    } catch (err) {
      console.error('Failed to start conversation:', err);
      throw err;
    }
  }, []);

  return {
    conversations,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    deleteConversation,
    startConversation,
  };
}
