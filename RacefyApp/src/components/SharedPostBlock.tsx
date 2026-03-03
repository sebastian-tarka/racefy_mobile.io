import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize, borderRadius } from '../theme';
import { formatDuration, getSportIcon } from './FeedCard.utils';
import type { SharedPost } from '../types/api';

interface SharedPostBlockProps {
  sharedPost: SharedPost;
  onPress?: () => void;
  onUserPress?: (username: string) => void;
}

export function SharedPostBlock({ sharedPost, onPress, onUserPress }: SharedPostBlockProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const photos = [
    ...(sharedPost.photos || []),
    ...(sharedPost.media || []).filter(m => !m.mime_type?.startsWith('video/')),
  ];

  const handleUserPress = () => {
    if (sharedPost.user?.username && onUserPress) {
      onUserPress(sharedPost.user.username);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderLeftColor: '#06b6d4',
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="repeat-outline" size={14} color="#06b6d4" />
        <Text style={[styles.headerLabel, { color: '#06b6d4' }]}>
          {t('reshare.resharedPost')}
        </Text>
      </View>

      {/* Author */}
      {sharedPost.user && (
        <TouchableOpacity
          style={styles.authorRow}
          onPress={handleUserPress}
          disabled={!onUserPress}
        >
          <Avatar uri={sharedPost.user.avatar} name={sharedPost.user.name} size="sm" />
          <Text style={[styles.authorName, { color: colors.textPrimary }]} numberOfLines={1}>
            {sharedPost.user.name}
          </Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      {sharedPost.content ? (
        <Text
          style={[styles.content, { color: colors.textSecondary }]}
          numberOfLines={4}
        >
          {sharedPost.content}
        </Text>
      ) : null}

      {/* Activity mini-stats */}
      {sharedPost.activity && (
        <View style={[styles.activityRow, { borderTopColor: colors.borderLight }]}>
          <Ionicons
            name={getSportIcon(sharedPost.activity.sport_type?.name)}
            size={14}
            color={colors.textSecondary}
          />
          {sharedPost.activity.distance > 0 && (
            <Text style={[styles.activityStat, { color: colors.textSecondary }]}>
              {(sharedPost.activity.distance / 1000).toFixed(1)} km
            </Text>
          )}
          {sharedPost.activity.duration > 0 && (
            <Text style={[styles.activityStat, { color: colors.textSecondary }]}>
              {formatDuration(sharedPost.activity.duration)}
            </Text>
          )}
        </View>
      )}

      {/* Photo preview */}
      {photos.length > 0 && (
        <View style={styles.photoRow}>
          {photos.slice(0, 2).map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: fixStorageUrl(photo.url) || '' }}
              style={styles.photoThumb}
            />
          ))}
          {photos.length > 2 && (
            <View style={[styles.morePhotos, { backgroundColor: colors.border }]}>
              <Text style={[styles.morePhotosText, { color: colors.textSecondary }]}>
                +{photos.length - 2}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  authorName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  content: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  activityStat: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  photoRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  photoThumb: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
