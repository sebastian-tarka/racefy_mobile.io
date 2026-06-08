import { useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { usePaginatedFetch } from './usePaginatedFetch';
import type { MediaItem, Post, ReshareRequest } from '../types/api';

export function useFeed() {
  const {
    data: posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    setData: setPosts,
  } = usePaginatedFetch<Post>((page) => api.getFeed(page), {
    // FeedScreen drives the initial load itself, so the hook must not auto-fetch.
    autoLoad: false,
    dedupeBy: (p) => p.id,
    errorMessage: 'Failed to load feed',
  });

  /**
   * Pure local state update — applied after the InteractionButton has
   * already confirmed the like/unlike with the server.
   */
  const applyLikeChange = useCallback(
    (postId: number, isLiked: boolean, likesCount: number) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, is_liked: isLiked, likes_count: likesCount } : p,
        ),
      );
    },
    [setPosts],
  );

  /**
   * Pure local state update — applied after the InteractionButton has
   * already confirmed the boost/unboost with the server.
   */
  const applyBoostChange = useCallback(
    (postId: number, isBoosted: boolean, boostsCount: number) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.activity) return p;
          return {
            ...p,
            activity: {
              ...p.activity,
              is_boosted: isBoosted,
              boosts_count: boostsCount,
            },
          };
        }),
      );
    },
    [setPosts],
  );

  const createPost = useCallback(
    async (
      content: string,
      media?: MediaItem[],
      visibility: 'public' | 'followers' | 'private' = 'public',
    ) => {
      const newPost = await api.createPost({ content: content || ' ', visibility });

      // Upload media items if provided
      if (media && media.length > 0) {
        const uploadedMedia = [];
        for (const item of media) {
          try {
            const uploaded = await api.uploadPostMedia(newPost.id, item);
            uploadedMedia.push(uploaded);
          } catch (uploadError) {
            logger.error('api', 'Failed to upload media item', { error: uploadError });
            // Continue with other uploads
          }
        }
        newPost.media = uploadedMedia;
      }

      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    },
    [setPosts],
  );

  const deletePost = useCallback(
    async (postId: number) => {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    [setPosts],
  );

  const resharePost = useCallback(
    async (originalPostId: number, data: ReshareRequest = {}) => {
      const resharedPost = await api.resharePost(originalPostId, data);
      setPosts((prev) => {
        const updated = prev.map((p) =>
          p.id === originalPostId
            ? { ...p, reshares_count: (p.reshares_count || 0) + 1, is_reshared: true }
            : p,
        );
        return [resharedPost, ...updated];
      });
    },
    [setPosts],
  );

  const unresharePost = useCallback(
    async (originalPostId: number) => {
      await api.unresharePost(originalPostId);
      setPosts((prev) => {
        const filtered = prev.filter((p) => !(p.shared_post?.id === originalPostId && p.is_owner));
        return filtered.map((p) =>
          p.id === originalPostId
            ? { ...p, reshares_count: Math.max((p.reshares_count || 0) - 1, 0), is_reshared: false }
            : p,
        );
      });
    },
    [setPosts],
  );

  return {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    applyLikeChange,
    applyBoostChange,
    createPost,
    deletePost,
    resharePost,
    unresharePost,
  };
}
