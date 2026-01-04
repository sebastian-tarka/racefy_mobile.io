import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { MediaGallery } from './MediaGallery';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { DraftPost } from '../types/api';

interface DraftPostCardProps {
  post: DraftPost;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function DraftPostCard({
  post,
  onPublish,
  onEdit,
  onDelete,
  isPublishing = false,
}: DraftPostCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const renderAiBadge = () => {
    if (!post.ai_generation?.is_ai_generated) return null;

    return (
      <View style={[styles.aiBadge, { backgroundColor: colors.aiLight }]}>
        <Ionicons name="sparkles" size={12} color={colors.ai} />
        <Text style={[styles.aiBadgeText, { color: colors.ai }]}>
          {t('drafts.aiGenerated')}
        </Text>
      </View>
    );
  };

  const renderDraftBanner = () => {
    return (
      <View style={[styles.draftBanner, { backgroundColor: colors.draftLight, borderColor: colors.draftBorder }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.draft} />
        <Text style={[styles.draftBannerText, { color: colors.draft }]}>
          {t('drafts.draftBanner')}
        </Text>
      </View>
    );
  };

  const renderMedia = () => {
    const hasMedia = post.media && post.media.length > 0;
    const hasPhotos = post.photos && post.photos.length > 0;
    const hasVideos = post.videos && post.videos.length > 0;

    if (!hasMedia && !hasPhotos && !hasVideos) return null;

    const mediaWidth = screenWidth - spacing.lg * 4;

    return (
      <MediaGallery
        media={post.media}
        photos={post.photos}
        videos={post.videos}
        width={mediaWidth}
      />
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {renderAiBadge()}
        <TouchableOpacity onPress={onDelete} style={styles.menuButton}>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {renderDraftBanner()}

      {post.title && (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {post.title}
        </Text>
      )}

      {post.content && (
        <Text style={[styles.content, { color: colors.textPrimary }]} numberOfLines={4}>
          {post.content}
        </Text>
      )}

      {renderMedia()}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onPublish}
          style={[styles.publishButton, { backgroundColor: colors.primary }]}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
              <Text style={[styles.publishButtonText, { color: colors.white }]}>
                {t('drafts.publish')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onEdit}
          style={[styles.editButton, { borderColor: colors.primary }]}
          disabled={isPublishing}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}>
            {t('drafts.editThenPublish')}
          </Text>
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
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  menuButton: {
    padding: spacing.sm,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  draftBannerText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  content: {
    fontSize: fontSize.md,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  publishButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  publishButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
