import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { api } from '../services/api';
import type { Post } from '../types/api';

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

        setPosts((prev) => {
          if (reset) return response.data;
          // Deduplicate by post ID when loading more
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = response.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        setHasMore(response.meta.current_page < response.meta.last_page);
        setPage(currentPage + 1);
      } catch (err) {
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

  const createPost = useCallback(async (content: string, imageUri?: string) => {
    try {
      const newPost = await api.createPost({ content: content || ' ' });

      // Upload image if provided
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        let type = 'image/jpeg';
        if (match) {
          const ext = match[1].toLowerCase();
          if (ext === 'png') type = 'image/png';
          else if (ext === 'gif') type = 'image/gif';
          else if (ext === 'heic' || ext === 'heif') type = 'image/heic';
          else type = 'image/jpeg';
        }

        // iOS requires removing file:// prefix
        const uri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;

        formData.append('photo', {
          uri,
          name: filename,
          type,
        } as any);

        const photo = await api.uploadPostPhoto(newPost.id, formData);
        newPost.photos = [photo];
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
