import { useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { usePaginatedFetch } from './usePaginatedFetch';
import type { Conversation } from '../types/api';

export function useConversations() {
  const {
    data: conversations,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    setData: setConversations,
  } = usePaginatedFetch<Conversation>((page) => api.getConversations(page), {
    // ConversationsListScreen drives the initial load itself.
    autoLoad: false,
    dedupeBy: (c) => c.id,
    errorMessage: 'Failed to load conversations',
  });

  const deleteConversation = useCallback(
    async (conversationId: number) => {
      try {
        await api.deleteConversation(conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      } catch (err) {
        logger.error('api', 'Failed to delete conversation', { error: err });
        throw err;
      }
    },
    [setConversations],
  );

  const startConversation = useCallback(
    async (userId: number) => {
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
        logger.error('api', 'Failed to start conversation', { error: err });
        throw err;
      }
    },
    [setConversations],
  );

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
