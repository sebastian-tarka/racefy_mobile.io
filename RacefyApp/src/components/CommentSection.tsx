import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { Card } from './Card';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { emitRefresh } from '../services/refreshEvents';
import { spacing, fontSize } from '../theme';
import type { Comment, CommentableType, User, MediaItem } from '../types/api';

interface CommentSectionProps {
  commentableType: CommentableType;
  commentableId: number;
  onUserPress?: (user: User) => void;
  initialExpanded?: boolean;
  commentsCount?: number;
  onInputFocus?: () => void;
}

export function CommentSection({
  commentableType,
  commentableId,
  onUserPress,
  initialExpanded = false,
  commentsCount = 0,
  onInputFocus,
}: CommentSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let fetchedComments: Comment[];
      switch (commentableType) {
        case 'post':
          fetchedComments = await api.getComments(commentableId);
          break;
        case 'event':
          fetchedComments = await api.getEventComments(commentableId);
          break;
        default:
          fetchedComments = [];
      }
      setComments(fetchedComments);
      setLocalCommentsCount(fetchedComments.length);
    } catch (err) {
      setError(t('comments.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [commentableType, commentableId, t]);

  useEffect(() => {
    if (isExpanded && comments.length === 0 && isAuthenticated) {
      fetchComments();
    }
  }, [isExpanded, fetchComments, comments.length, isAuthenticated]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchComments();
  }, [fetchComments]);

  const handleCreateComment = async (content: string, photo?: MediaItem) => {
    const data = {
      content,
      parent_id: replyingTo?.id,
      photo,
    };

    let newComment: Comment;
    switch (commentableType) {
      case 'post':
        newComment = await api.createComment(commentableId, data);
        break;
      case 'event':
        newComment = await api.createEventComment(commentableId, data);
        break;
      default:
        throw new Error('Invalid commentable type');
    }

    // Add user info to the new comment
    if (user) {
      newComment.user = user;
    }

    if (replyingTo) {
      // Add as reply to parent comment
      setComments((prev) =>
        prev.map((c) =>
          c.id === replyingTo.id
            ? { ...c, replies: [...(c.replies || []), newComment] }
            : c
        )
      );
    } else {
      // Add as top-level comment
      setComments((prev) => [newComment, ...prev]);
    }

    setLocalCommentsCount((prev) => prev + 1);
    setReplyingTo(null);
    emitRefresh('feed');
  };

  const handleLikeComment = async (commentId: number) => {
    await api.likeComment(commentId);
  };

  const handleUnlikeComment = async (commentId: number) => {
    await api.unlikeComment(commentId);
  };

  const handleDeleteComment = async (commentId: number) => {
    await api.deleteComment(commentId);
    setComments((prev) => {
      // Remove from top-level
      const filtered = prev.filter((c) => c.id !== commentId);
      // Remove from replies
      return filtered.map((c) => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== commentId),
      }));
    });
    setLocalCommentsCount((prev) => prev - 1);
    emitRefresh('feed');
  };

  const handleEditComment = async (
    commentId: number,
    data: { content: string; deleteMediaId?: number; newMedia?: MediaItem }
  ) => {
    // Delete existing media if requested (before update)
    if (data.deleteMediaId) {
      try {
        await api.deleteCommentPhoto(commentId, data.deleteMediaId);
      } catch (e) {
        logger.warn('api', 'Failed to delete photo', { error: e });
      }
    }

    // Update comment content (with optional new photo - replaces existing)
    const updatedComment = await api.updateComment(
      commentId,
      data.content,
      data.newMedia
    );

    // Update local state with the returned comment data
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            content: updatedComment.content,
            photos: updatedComment.photos || [],
          };
        }
        // Check in replies
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === commentId) {
                return {
                  ...r,
                  content: updatedComment.content,
                  photos: updatedComment.photos || [],
                };
              }
              return r;
            }),
          };
        }
        return c;
      })
    );
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      onLike={handleLikeComment}
      onUnlike={handleUnlikeComment}
      onDelete={handleDeleteComment}
      onEdit={handleEditComment}
      onReply={handleReply}
      onUserPress={onUserPress}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{error}</Text>
          <TouchableOpacity onPress={fetchComments}>
            <Text style={[styles.retryText, { color: colors.primary }]}>{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('comments.noComments')}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          {t('comments.beFirst')}
        </Text>
      </View>
    );
  };

  return (
    <Card style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerLeft}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.textPrimary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('comments.title')}
          </Text>
          {localCommentsCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{localCommentsCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <>
          {isAuthenticated ? (
            <>
              {/* Comments list */}
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={renderEmpty}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
              />

              {/* Comment input */}
              <CommentInput
                onSubmit={handleCreateComment}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                onFocus={onInputFocus}
                placeholder={
                  replyingTo
                    ? t('comments.replyPlaceholder', { name: replyingTo.user?.name })
                    : undefined
                }
              />
            </>
          ) : (
            <View style={styles.authPrompt}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.authPromptTitle, { color: colors.textPrimary }]}>
                {t('comments.signInRequired')}
              </Text>
              <Text style={[styles.authPromptText, { color: colors.textMuted }]}>
                {t('comments.signInToViewComments')}
              </Text>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  countBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  retryText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  authPrompt: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  authPromptTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  authPromptText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
