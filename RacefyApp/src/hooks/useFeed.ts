import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Post, MediaItem } from '../types/api';

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(
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
        const response = await api.getFeed(currentPage);

        // Handle different API response structures
        const responseAny = response as any;
        const postsData: Post[] = responseAny?.data ?? responseAny ?? [];
        const meta = responseAny?.meta ?? { current_page: 1, last_page: 1 };

        if (!Array.isArray(postsData)) {
          logger.error('api', 'Invalid feed response - data is not an array', { postsData });
          setError('Failed to load feed');
          return;
        }

        setPosts((prev) => {
          if (reset) return postsData;
          // Deduplicate by post ID when loading more
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = postsData.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        setHasMore(meta.current_page < meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
        logger.error('api', 'Failed to fetch posts', { error: err });
        setError('Failed to load feed');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, isLoading]
  );

  const refresh = useCallback(() => fetchFeed(true), [fetchFeed]);
  const loadMore = useCallback(
    () => hasMore && !isLoading && fetchFeed(false),
    [hasMore, isLoading, fetchFeed]
  );

  const likePost = useCallback(async (postId: number) => {
    try {
      await api.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + 1, is_liked: true }
            : p
        )
      );
    } catch (err) {
      // Handle error
    }
  }, []);

  const unlikePost = useCallback(async (postId: number) => {
    try {
      await api.unlikePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count - 1, is_liked: false }
            : p
        )
      );
    } catch (err) {
      // Handle error
    }
  }, []);

  const toggleLike = useCallback(
    async (post: Post) => {
      if (post.is_liked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    },
    [likePost, unlikePost]
  );

  const createPost = useCallback(async (
    content: string,
    media?: MediaItem[],
    visibility: 'public' | 'followers' | 'private' = 'public'
  ) => {
    try {
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
    } catch (err) {
      throw err;
    }
  }, []);

  const deletePost = useCallback(async (postId: number) => {
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    likePost,
    unlikePost,
    toggleLike,
    createPost,
    deletePost,
  };
}
