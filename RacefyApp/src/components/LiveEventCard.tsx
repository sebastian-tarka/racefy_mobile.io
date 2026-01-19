import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Badge } from './Badge';
import { CommentaryBoostButton } from './CommentaryBoostButton';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { fixStorageUrl } from '../config/api';
import type { EventWithLatestCommentary } from '../types/api';

interface LiveEventCardProps {
  event: EventWithLatestCommentary;
  onPress?: () => void;
  onBoostComplete?: () => void;
}

export function LiveEventCard({ event, onPress, onBoostComplete }: LiveEventCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const formattedDate = format(new Date(event.starts_at), 'MMM d, h:mm a');

  const imageUrl = fixStorageUrl(event.cover_image_url || event.post?.photos?.[0]?.url);

  const getSportIcon = (): keyof typeof Ionicons.glyphMap => {
    const sportName = event.sport_type?.name?.toLowerCase() || '';
    if (sportName.includes('run')) return 'walk-outline';
    if (sportName.includes('cycling') || sportName.includes('bike'))
      return 'bicycle-outline';
    if (sportName.includes('swim')) return 'water-outline';
    if (sportName.includes('gym') || sportName.includes('fitness'))
      return 'barbell-outline';
    if (sportName.includes('yoga')) return 'body-outline';
    return 'fitness-outline';
  };

  const activeParticipantsText =
    event.active_participants_count !== undefined
      ? `${event.active_participants_count} live`
      : `${event.participants_count} total`;

  const hasCommentary = !!event.latest_commentary;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Card style={styles.card} noPadding>
        {/* LIVE Badge */}
        <View style={styles.liveBadgeContainer}>
          <Badge variant="danger" size="small">
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: colors.background }]} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </Badge>
        </View>

        {/* Image/Icon */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.iconPlaceholder,
                { backgroundColor: colors.primaryLight + '20' },
              ]}
            >
              <Ionicons name={getSportIcon()} size={48} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Event Info */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {event.post?.title || 'Untitled Event'}
          </Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {formattedDate}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {activeParticipantsText}
            </Text>
          </View>

          {event.location_name && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {event.location_name}
              </Text>
            </View>
          )}

          {/* Latest AI Commentary */}
          {hasCommentary && event.latest_commentary && (
            <View
              style={[
                styles.commentaryContainer,
                {
                  backgroundColor: `${colors.primary}10`,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <View style={styles.commentaryHeader}>
                <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                <Text style={[styles.commentaryTitle, { color: colors.primary }]}>
                  {event.latest_commentary.title || t('home.liveCommentary')}
                </Text>
              </View>
              <Text
                style={[styles.commentaryContent, { color: colors.textPrimary }]}
                numberOfLines={3}
              >
                {event.latest_commentary.content}
              </Text>
              <View style={styles.commentaryFooter}>
                <Text style={[styles.commentaryTime, { color: colors.textSecondary }]}>
                  {event.latest_commentary.published_at &&
                    format(new Date(event.latest_commentary.published_at), 'h:mm a')}
                </Text>
                <CommentaryBoostButton
                  eventId={event.id}
                  commentaryId={event.latest_commentary.id}
                  boostsCount={event.latest_commentary.boosts_count}
                  userBoosted={event.latest_commentary.user_boosted}
                  onBoostComplete={onBoostComplete}
                />
              </View>
            </View>
          )}

          {/* No Commentary Fallback */}
          {!hasCommentary && (
            <View
              style={[
                styles.noCommentaryContainer,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.noCommentaryText, { color: colors.textSecondary }]}>
                {t('home.waitingForCommentary')}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  liveBadgeContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
  },
  commentaryContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
  },
  commentaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentaryTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  commentaryContent: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  commentaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentaryTime: {
    fontSize: fontSize.xs,
  },
  noCommentaryContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noCommentaryText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
});