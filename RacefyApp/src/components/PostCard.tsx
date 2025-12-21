import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { colors, spacing, fontSize } from '../theme';
import type { Post } from '../types/api';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onUserPress?: () => void;
  onMenuPress?: () => void;
  isOwner?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onUserPress,
  onMenuPress,
  isOwner = false,
}: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: false,
  });

  const renderPhotos = () => {
    if (!post.photos || post.photos.length === 0) return null;

    const photos = post.photos.slice(0, 4);
    const photoWidth = screenWidth - spacing.lg * 4;

    if (photos.length === 1) {
      return (
        <Image
          source={{ uri: photos[0].url }}
          style={[styles.singlePhoto, { width: photoWidth }]}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.photoGrid}>
        {photos.map((photo, index) => (
          <Image
            key={photo.id}
            source={{ uri: photo.url }}
            style={[
              styles.gridPhoto,
              { width: (photoWidth - spacing.xs) / 2 },
            ]}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        disabled={!onPress}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onUserPress}
            style={styles.userInfo}
            disabled={!onUserPress}
          >
            <Avatar
              uri={post.user?.avatar}
              name={post.user?.name}
              size="md"
            />
            <View style={styles.userText}>
              <Text style={styles.userName}>{post.user?.name}</Text>
              <Text style={styles.userHandle}>
                @{post.user?.username} · {timeAgo}
              </Text>
            </View>
          </TouchableOpacity>
          {isOwner && onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {post.content && <Text style={styles.content}>{post.content}</Text>}

        {renderPhotos()}
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onLike}
          style={styles.actionButton}
          disabled={!onLike}
        >
          <Ionicons
            name={post.is_liked ? 'heart' : 'heart-outline'}
            size={22}
            color={post.is_liked ? colors.error : colors.textSecondary}
          />
          <Text
            style={[styles.actionText, post.is_liked && styles.likedText]}
          >
            {post.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onComment}
          style={styles.actionButton}
          disabled={!onComment}
        >
          <Ionicons
            name="chatbubble-outline"
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  menuButton: {
    padding: spacing.sm,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  singlePhoto: {
    height: 200,
    marginTop: spacing.md,
    borderRadius: 0,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  gridPhoto: {
    height: 150,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  actionText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  likedText: {
    color: colors.error,
  },
});
