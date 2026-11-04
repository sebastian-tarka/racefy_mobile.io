import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../Avatar';
import { Card } from '../Card';
import { LivePulse } from '../recording/LivePulse';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, spacing, withAlpha } from '../../theme';
import type { RankedRow } from '../../utils/eventStandings';

const MAX_ROWS = 5;

interface LiveCheerCardProps {
  rows: RankedRow[];
  currentUserId?: number | null;
  /** Opens the spectator screen of that broadcast. */
  onCheer: (activityId: number) => void;
}

/**
 * "Dopinguj na trasie" (design 3a–3d): athletes on course whose broadcast the viewer
 * may watch (`live.activity_id`), each leading to the spectator screen where text and
 * voice cheers are sent. Athletes recording without a watchable broadcast only count
 * in the footer. Nothing when nobody is on course.
 */
export function LiveCheerCard({ rows, currentUserId, onCheer }: LiveCheerCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const units = useUnits();

  const onCourse = rows.filter((r) => r.isRecording && r.user?.id !== currentUserId);
  const watchable = onCourse.filter((r) => r.liveActivityId != null);
  if (onCourse.length === 0) return null;

  const shown = watchable.slice(0, MAX_ROWS);
  const hidden = onCourse.length - shown.length;

  return (
    <Card noPadding testID="live-cheer">
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('eventLive.cheer.title', 'Cheer on course')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('eventLive.cheer.subtitle', 'text or voice')}
        </Text>
      </View>
      {shown.map((row) => (
        <View key={row.key} style={[styles.row, { borderBottomColor: colors.border }]}>
          <Avatar
            uri={fixStorageUrl(row.user?.avatar_url ?? row.user?.avatar ?? null)}
            variants={row.user?.avatar_variants}
            name={row.user?.name ?? '?'}
            size="sm"
          />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {row.user?.name ?? '—'}
              </Text>
              <LivePulse color={colors.primary} size={6} />
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {t('eventLive.cheer.position', {
                n: row.position,
                distance: units.formatDistanceShort(row.distance),
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.cheer, { backgroundColor: withAlpha(colors.primaryLight, 0.16) }]}
            onPress={() => row.liveActivityId != null && onCheer(row.liveActivityId)}
            activeOpacity={0.8}
            accessibilityRole="button"
            testID={`cheer-${row.liveActivityId}`}
          >
            <Text style={[styles.cheerText, { color: colors.primary }]}>
              {t('eventLive.cheer.action', 'Cheer')}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
      {hidden > 0 && (
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {shown.length > 0
            ? t('eventLive.cheer.more', { count: hidden })
            : t('eventLive.cheer.noBroadcast', { count: onCourse.length })}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  meta: {
    fontSize: fontSize.xs,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  cheer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  cheerText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.xs,
  },
});
