import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius } from '../theme';
import { formatDistanceToNow } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { EventCommentary, CommentaryType } from '../types/api';

interface CommentaryItemProps {
  commentary: EventCommentary;
}

export function CommentaryItem({ commentary }: CommentaryItemProps) {
  const { colors } = useTheme();
  const { i18n } = useTranslation();

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {commentary.title}
        </Text>
      )}

      {/* Content */}
      <Text style={[styles.content, { color: colors.textSecondary }]}>
        {commentary.content}
      </Text>

      {/* Status indicator for pending/processing/failed */}
      {commentary.status !== 'published' && (
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  commentary.status === 'failed'
                    ? colors.errorLight
                    : colors.warningLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    commentary.status === 'failed'
                      ? colors.error
                      : colors.warning,
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
    fontSize: 16,
    marginRight: spacing.xs,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  content: {
    fontSize: 15,
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
    fontSize: 12,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
