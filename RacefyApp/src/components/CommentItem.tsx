import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { MediaGallery } from './MediaGallery';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Comment, User } from '../types/api';

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: number) => Promise<void>;
  onUnlike: (commentId: number) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onReply?: (comment: Comment) => void;
  onUserPress?: (user: User) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  onLike,
  onUnlike,
  onDelete,
  onReply,
  onUserPress,
  isReply = false,
}: CommentItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [localIsLiked, setLocalIsLiked] = useState(comment.is_liked || false);
  const [localLikesCount, setLocalLikesCount] = useState(comment.likes_count);

  const isOwnComment = currentUser?.id === comment.user_id;

  const handleLikeToggle = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const wasLiked = localIsLiked;

    // Optimistic update
    setLocalIsLiked(!wasLiked);
    setLocalLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        await onUnlike(comment.id);
      } else {
        await onLike(comment.id);
      }
    } catch {
      // Revert on error
      setLocalIsLiked(wasLiked);
      setLocalLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('comments.deleteComment'),
      t('comments.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]
    );
  };

  const handleUserPress = () => {
    if (comment.user && onUserPress) {
      onUserPress(comment.user);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
  });

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <TouchableOpacity onPress={handleUserPress} disabled={!onUserPress}>
        <Avatar
          uri={comment.user?.avatar}
          name={comment.user?.name || '?'}
          size={isReply ? 'sm' : 'md'}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleUserPress} disabled={!onUserPress}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {comment.user?.name || t('comments.unknownUser')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>

        {/* Comment text */}
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {comment.content}
        </Text>

        {/* Media */}
        {comment.media && comment.media.length > 0 && (
          <View style={styles.mediaContainer}>
            <MediaGallery media={comment.media} width={isReply ? 200 : 250} />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikeToggle}
            disabled={isLiking}
          >
            <Ionicons
              name={localIsLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={localIsLiked ? colors.error : colors.textMuted}
            />
            {localLikesCount > 0 && (
              <Text
                style={[
                  styles.actionText,
                  { color: localIsLiked ? colors.error : colors.textMuted },
                ]}
              >
                {localLikesCount}
              </Text>
            )}
          </TouchableOpacity>

          {onReply && !isReply && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onReply(comment)}
            >
              <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.actionText, { color: colors.textMuted }]}>
                {t('comments.reply')}
              </Text>
            </TouchableOpacity>
          )}

          {isOwnComment && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.replies}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onUnlike={onUnlike}
                onDelete={onDelete}
                onUserPress={onUserPress}
                isReply
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  replyContainer: {
    paddingLeft: 0,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  time: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  mediaContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.xs,
    marginLeft: 4,
  },
  replies: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
});
