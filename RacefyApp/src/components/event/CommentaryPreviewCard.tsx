import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../services/api';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { CommentaryListResponse } from '../../types/api';

const ACCENT = '#8b5cf6'; // commentary purple accent (matches mockup)

/**
 * Compact "RACE COMMENTARY" preview showing the latest published commentary.
 * Tapping opens the full commentary timeline.
 */
export function CommentaryPreviewCard({
  eventId,
  isLive,
  onPress,
}: {
  eventId: number;
  isLive?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { data } = useFetch<CommentaryListResponse>(
    () => api.getEventCommentary(eventId, { per_page: 1 }),
    { deps: [eventId], logCategory: 'api', errorMessage: 'Failed to load commentary' },
  );

  const latest = data?.data?.[0];
  if (!latest) return null;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card style={styles.card}>
        <View style={[styles.icon, { backgroundColor: ACCENT + '20' }]}>
          <Ionicons name="sparkles" size={18} color={ACCENT} />
        </View>
        <View style={styles.body}>
          <View style={styles.headRow}>
            <View style={[styles.tag, { backgroundColor: ACCENT + '18' }]}>
              <Text style={[styles.tagText, { color: ACCENT }]}>
                {t('commentary.raceCommentary', 'Race commentary').toUpperCase()}
              </Text>
            </View>
            {isLive && <View style={[styles.dot, { backgroundColor: colors.error }]} />}
          </View>
          <Text style={[styles.text, { color: colors.textPrimary }]} numberOfLines={2}>
            {latest.title || latest.content}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {isLive
              ? t('eventDetail.commentaryUpdating', 'Updating live · tap for full timeline')
              : latest.published_at
                ? format(new Date(latest.published_at), 'HH:mm')
                : t('eventDetail.commentaryTapTimeline', 'Tap for full timeline')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 19,
  },
  meta: {
    fontSize: fontSize.xs,
  },
});
