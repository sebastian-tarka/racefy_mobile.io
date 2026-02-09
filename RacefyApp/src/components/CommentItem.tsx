import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from './Avatar';
import { MediaGallery } from './MediaGallery';
import { MentionText } from './MentionText';
import { MentionInput as MentionInputComponent } from './MentionInput';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { stripMentionsForApi, apiTokensToLibraryFormat } from '../utils/mentions';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Comment, User, MediaItem, Photo } from '../types/api';

interface MediaEditState {
  existingMedia: Photo | null;  // Current media from comment
  newMedia: MediaItem | null;   // New media to upload
  shouldDelete: boolean;        // Whether to delete existing media
}

interface CommentEditData {
  content: string;
  deleteMediaId?: number;       // ID of existing media to delete
  newMedia?: MediaItem;         // New media to upload
}

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: number) => Promise<void>;
  onUnlike: (commentId: number) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onEdit?: (commentId: number, data: CommentEditData) => Promise<void>;
  onReply?: (comment: Comment) => void;
  onUserPress?: (user: User) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  onLike,
  onUnlike,
  onDelete,
  onEdit,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [localContent, setLocalContent] = useState(comment.content);
  const [localPhotos, setLocalPhotos] = useState(comment.photos || []);

  // Media editing state
  const [mediaEdit, setMediaEdit] = useState<MediaEditState>({
    existingMedia: null,
    newMedia: null,
    shouldDelete: false,
  });

  const isOwnComment = currentUser?.id === (comment.user_id ?? comment.user?.id);
  const currentPhoto = localPhotos[0] || null;

  // Sync local state when comment prop changes
  useEffect(() => {
    setLocalContent(comment.content);
    setLocalPhotos(comment.photos || []);
  }, [comment.content, comment.photos]);

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

  const handleStartEdit = () => {
    setEditContent(apiTokensToLibraryFormat(localContent, comment.mentions));
    setMediaEdit({
      existingMedia: currentPhoto,
      newMedia: null,
      shouldDelete: false,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(localContent);
    setMediaEdit({
      existingMedia: null,
      newMedia: null,
      shouldDelete: false,
    });
    setIsEditing(false);
  };

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setMediaEdit((prev) => ({
        ...prev,
        newMedia: {
          uri: asset.uri,
          type: 'image',
          width: asset.width,
          height: asset.height,
        },
        // If we're adding new media, we should delete the old one
        shouldDelete: !!prev.existingMedia,
      }));
    }
  };

  const handleRemoveMedia = () => {
    if (mediaEdit.newMedia) {
      // Just remove the new media we picked
      setMediaEdit((prev) => ({
        ...prev,
        newMedia: null,
        shouldDelete: !!currentPhoto, // Keep shouldDelete if there was existing media
      }));
    } else if (mediaEdit.existingMedia) {
      // Mark existing media for deletion
      setMediaEdit((prev) => ({
        ...prev,
        existingMedia: null,
        shouldDelete: true,
      }));
    }
  };

  const handleSubmitEdit = async () => {
    if (!onEdit || !editContent.trim() || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    try {
      const editData: CommentEditData = {
        content: stripMentionsForApi(editContent.trim()),
      };

      // If we should delete existing media
      if (mediaEdit.shouldDelete && currentPhoto) {
        editData.deleteMediaId = currentPhoto.id;
      }

      // If we have new media to upload
      if (mediaEdit.newMedia) {
        editData.newMedia = mediaEdit.newMedia;
      }

      await onEdit(comment.id, editData);

      // Local state will be synced via useEffect when parent updates the comment

      setIsEditing(false);
      setMediaEdit({
        existingMedia: null,
        newMedia: null,
        shouldDelete: false,
      });
    } catch {
      Alert.alert(t('comments.failedToEdit'));
    } finally {
      setIsSubmittingEdit(false);
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

        {/* Comment text or edit input */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <MentionInputComponent
              value={editContent}
              onChange={setEditContent}
              autoFocus
              maxLength={2000}
              inputStyle={styles.editInput}
            />

            {/* Media editing section */}
            <View style={styles.editMediaSection}>
              {(mediaEdit.existingMedia || mediaEdit.newMedia) ? (
                <View style={styles.editMediaPreview}>
                  <Image
                    source={{
                      uri: mediaEdit.newMedia?.uri || mediaEdit.existingMedia?.url,
                    }}
                    style={styles.editMediaImage}
                  />
                  <View style={styles.editMediaButtons}>
                    <TouchableOpacity
                      style={[styles.editMediaButton, { backgroundColor: colors.primary }]}
                      onPress={handlePickMedia}
                      disabled={isSubmittingEdit}
                    >
                      <Ionicons name="swap-horizontal" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editMediaButton, { backgroundColor: colors.error }]}
                      onPress={handleRemoveMedia}
                      disabled={isSubmittingEdit}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addMediaButton, { borderColor: colors.border }]}
                  onPress={handlePickMedia}
                  disabled={isSubmittingEdit}
                >
                  <Ionicons name="image-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.addMediaText, { color: colors.textMuted }]}>
                    {t('comments.addPhoto')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.border }]}
                onPress={handleCancelEdit}
                disabled={isSubmittingEdit}
              >
                <Text style={[styles.editButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: editContent.trim() ? colors.primary : colors.border },
                ]}
                onPress={handleSubmitEdit}
                disabled={!editContent.trim() || isSubmittingEdit}
              >
                {isSubmittingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.editButtonText, { color: '#fff' }]}>
                    {t('common.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <MentionText
            text={localContent}
            mentions={comment.mentions}
            style={[styles.text, { color: colors.textSecondary }]}
          />
        )}

        {/* Media (only show when not editing) */}
        {!isEditing && (localPhotos.length || comment.videos?.length || comment.media?.length) ? (
          <View style={styles.mediaContainer}>
            <MediaGallery
              photos={localPhotos}
              videos={comment.videos}
              media={comment.media}
              width={isReply ? 200 : 250}
            />
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
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
          </View>

          {isOwnComment && !isEditing && (
            <View style={styles.actionsRight}>
              {onEdit && (
                <TouchableOpacity style={styles.actionButton} onPress={handleStartEdit}>
                  <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
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
                onEdit={onEdit}
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
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  editContainer: {
    marginTop: spacing.xs,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  editMediaSection: {
    marginTop: spacing.sm,
  },
  editMediaPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  editMediaImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  editMediaButtons: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  editMediaButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  addMediaText: {
    fontSize: fontSize.sm,
  },
});
