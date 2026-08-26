import React, { useCallback } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing, msFont } from '../theme';
import { formatDistanceToNow } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { logger } from '../services/logger';
import { InteractionButton } from './InteractionButton';
import type { CommentaryType, EventCommentary } from '../types/api';

interface CommentaryItemProps {
  commentary: EventCommentary;
  eventId?: number;
  isAuthenticated?: boolean;
  onBoostChange?: (commentaryId: number, isBoosted: boolean, newBoostsCount: number) => void;
}

export function CommentaryItem({
  commentary,
  eventId,
  isAuthenticated,
  onBoostChange,
}: CommentaryItemProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const handleShare = useCallback(async () => {
    try {
      const message = [commentary.title, commentary.content].filter(Boolean).join('\n\n');
      await Share.share({ message });
    } catch (err) {
      logger.error('general', 'Commentary share failed', { error: err });
    }
  }, [commentary.title, commentary.content]);

  const getTypeIcon = (type: CommentaryType): string => {
    switch (type) {
      case 'warmup':
        return '🔥';
      case 'live':
        return '🎙️';
      case 'milestone':
        return '🏆';
      case 'summary':
        return '📊';
      default:
        return '📢';
    }
  };

  const getTypeColor = (type: CommentaryType): string => {
    switch (type) {
      case 'warmup':
        return '#F97316'; // Orange
      case 'live':
        return '#3B82F6'; // Blue
      case 'milestone':
        return '#F59E0B'; // Amber
      case 'summary':
        return colors.primary; // Emerald
      default:
        return colors.textSecondary;
    }
  };

  const getTypeBackground = (type: CommentaryType): string => {
    switch (type) {
      case 'warmup':
        return '#FFF7ED'; // Orange light
      case 'live':
        return '#EFF6FF'; // Blue light
      case 'milestone':
        return '#FFFBEB'; // Amber light
      case 'summary':
        return colors.successLight; // Emerald light
      default:
        return colors.borderLight;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'pl' ? pl : enUS;
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  const typeColor = getTypeColor(commentary.type);
  const typeBackground = getTypeBackground(commentary.type);

  const showBoostButton = eventId != null && isAuthenticated && commentary.status === 'published';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Header with type badge and timestamp */}
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: typeBackground }]}>
          <Text style={styles.typeIcon}>{getTypeIcon(commentary.type)}</Text>
          <Text style={[styles.typeText, { color: typeColor }]}>
            {commentary.type.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatTime(commentary.published_at || commentary.created_at)}
        </Text>
      </View>

      {/* Title (if present) */}
      {commentary.title && (
        <Text style={[styles.title, { color: colors.textPrimary }]}>{commentary.title}</Text>
      )}

      {/* Content */}
      <Text style={[styles.content, { color: colors.textSecondary }]}>{commentary.content}</Text>

      {/* Status indicator for pending/processing/failed */}
      {commentary.status !== 'published' && (
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  commentary.status === 'failed' ? colors.errorLight : colors.warningLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: commentary.status === 'failed' ? colors.error : colors.warning,
                },
              ]}
            >
              {commentary.status === 'pending' && 'Pending'}
              {commentary.status === 'processing' && 'Generating...'}
              {commentary.status === 'failed' && 'Failed'}
            </Text>
          </View>
          {commentary.error_message && (
            <Text style={[styles.errorMessage, { color: colors.error }]}>
              {commentary.error_message}
            </Text>
          )}
        </View>
      )}

      {/* Footer: trigger + boost/share actions */}
      {(showBoostButton || commentary.trigger) && (
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          {commentary.trigger ? (
            <Text style={[styles.trigger, { color: colors.textMuted }]} numberOfLines={1}>
              {t('eventDetail.trigger', 'Trigger')} ·{' '}
              {String(commentary.trigger).replace(/_/g, ' ')}
            </Text>
          ) : (
            <View style={styles.triggerSpacer} />
          )}
          <View style={styles.actions}>
            {showBoostButton && (
              <InteractionButton
                variant="boost"
                targetType="commentary"
                targetId={commentary.id}
                parentId={eventId}
                count={commentary.boosts_count ?? 0}
                isActive={commentary.user_boosted ?? false}
                size="md"
                pill
                onChange={(isBoosted, newBoostsCount) =>
                  onBoostChange?.(commentary.id, isBoosted, newBoostsCount)
                }
              />
            )}
            <TouchableOpacity
              style={[styles.shareButton, { borderColor: colors.border }]}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.shareText, { color: colors.textSecondary }]}>
                {t('common.share', 'Share')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  typeIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.xs,
  },
  typeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: fontSize.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  content: {
    fontSize: msFont(15),
    lineHeight: 22,
  },
  statusContainer: {
    marginTop: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  trigger: {
    flex: 1,
    fontSize: fontSize.xs,
  },
  triggerSpacer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  shareText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
