import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { MediaGallery } from './MediaGallery';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
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

// Helper functions
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
};

const formatPace = (meters: number, seconds: number): string => {
  if (meters === 0) return '-';
  const paceSecondsPerKm = (seconds / meters) * 1000;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.floor(paceSecondsPerKm % 60);
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;
};

const getSportIcon = (sportName?: string): keyof typeof Ionicons.glyphMap => {
  const name = sportName?.toLowerCase() || '';
  if (name.includes('run')) return 'walk-outline';
  if (name.includes('cycling') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('gym') || name.includes('fitness')) return 'barbell-outline';
  if (name.includes('yoga')) return 'body-outline';
  return 'fitness-outline';
};

export function PostCard({
  post,
  onPress,
  onLike,
  onComment,
  onUserPress,
  onMenuPress,
  isOwner = false,
}: PostCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: false,
  });

  const getTypeConfig = () => {
    switch (post.type) {
      case 'activity':
        return {
          icon: 'fitness-outline' as const,
          label: t('feed.postTypes.activity'),
          color: colors.primary,
        };
      case 'event':
        return {
          icon: 'calendar-outline' as const,
          label: t('feed.postTypes.event'),
          color: colors.warning,
        };
      default:
        return null;
    }
  };

  const typeConfig = getTypeConfig();

  const renderTypeBadge = () => {
    if (!typeConfig) return null;
    return (
      <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
        <Ionicons name={typeConfig.icon} size={12} color={typeConfig.color} />
        <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
          {typeConfig.label}
        </Text>
      </View>
    );
  };

  const renderActivityPreview = () => {
    if (post.type !== 'activity' || !post.activity) return null;
    const activity = post.activity;

    return (
      <View style={[styles.activityPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
        <View style={styles.activityHeader}>
          <View style={[styles.sportBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons
              name={getSportIcon(activity.sport_type?.name)}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.activityTitleContainer}>
            <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={[styles.activitySport, { color: colors.textSecondary }]}>
              {activity.sport_type?.name || t('activityDetail.activity')}
            </Text>
          </View>
        </View>

        <View style={[styles.activityStats, { borderTopColor: colors.borderLight }]}>
          <View style={styles.activityStatItem}>
            <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>{formatDistance(activity.distance)}</Text>
          </View>
          <View style={styles.activityStatItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>{formatDuration(activity.duration)}</Text>
          </View>
          <View style={styles.activityStatItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>
              {formatPace(activity.distance, activity.duration)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEventPreview = () => {
    if (post.type !== 'event' || !post.event) return null;
    const event = post.event;

    return (
      <View style={[styles.eventPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventDateBadge, { backgroundColor: colors.warning }]}>
            <Text style={[styles.eventDateDay, { color: colors.white }]}>
              {format(new Date(event.starts_at), 'd')}
            </Text>
            <Text style={[styles.eventDateMonth, { color: colors.white }]}>
              {format(new Date(event.starts_at), 'MMM')}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {post.title || t('eventDetail.untitled')}
            </Text>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>
            <View style={styles.eventTags}>
              {event.sport_type && (
                <View style={[styles.eventTag, { backgroundColor: colors.border }]}>
                  <Text style={[styles.eventTagText, { color: colors.textSecondary }]}>{event.sport_type.name}</Text>
                </View>
              )}
              <View style={[styles.eventTag, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.eventTagText, { color: colors.primary }]}>
                  {t(`difficulty.${event.difficulty}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMedia = () => {
    // Check for media first (new format), fallback to photos (legacy)
    const hasMedia = post.media && post.media.length > 0;
    const hasPhotos = post.photos && post.photos.length > 0;

    if (!hasMedia && !hasPhotos) return null;

    const mediaWidth = screenWidth - spacing.lg * 4;

    return (
      <MediaGallery
        media={post.media}
        photos={post.photos}
        width={mediaWidth}
      />
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
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{post.user?.name}</Text>
                {renderTypeBadge()}
              </View>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
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

        {post.content && <Text style={[styles.content, { color: colors.textPrimary }]}>{post.content}</Text>}

        {renderActivityPreview()}
        {renderEventPreview()}

        {renderMedia()}
      </TouchableOpacity>

      <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
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
            style={[styles.actionText, { color: colors.textSecondary }, post.is_liked && { color: colors.error }]}
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
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments_count}</Text>
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: fontSize.sm,
  },
  menuButton: {
    padding: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  content: {
    fontSize: fontSize.md,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  activityPreview: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activitySport: {
    fontSize: fontSize.xs,
  },
  activityStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    justifyContent: 'space-around',
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  eventPreview: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateDay: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  eventDateMonth: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventLocation: {
    fontSize: fontSize.xs,
    marginLeft: 4,
    flex: 1,
  },
  eventTags: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  eventTagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
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
  },
});
