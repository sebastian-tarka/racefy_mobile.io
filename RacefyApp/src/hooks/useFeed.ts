import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { Post, MediaItem } from '../types/api';

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs break the dependency cycle — page/isLoading used only inside fetchFeed
  const pageRef = useRef(1);
  const isLoadingRef = useRef(false);

  const fetchFeed = useCallback(async (reset = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    if (reset) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const currentPage = reset ? 1 : pageRef.current;
      const response = await api.getFeed(currentPage);
      const postsData = response.data;
      const meta = response.meta;

      setPosts((prev) => {
        if (reset) return postsData;
        // Deduplicate by post ID when loading more
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = postsData.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      setHasMore(meta.current_page < meta.last_page);
      pageRef.current = currentPage + 1;
    } catch (err) {
      logger.error('api', 'Failed to fetch posts', { error: err });
      setError('Failed to load feed');
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);  // stable — no deps needed thanks to refs

  const refresh = useCallback(() => fetchFeed(true), [fetchFeed]);
  // isLoadingRef.current guards against concurrent calls inside fetchFeed
  const loadMore = useCallback(
    () => hasMore && fetchFeed(false),
    [hasMore, fetchFeed]
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
      logger.error('api', 'Failed to like post', { postId, error: err });
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
      logger.error('api', 'Failed to unlike post', { postId, error: err });
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
