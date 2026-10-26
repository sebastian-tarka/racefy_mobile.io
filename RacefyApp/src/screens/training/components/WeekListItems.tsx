import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import type { TrainingWeek } from '../../../types/api';
import { formatDurationCompact } from '../../../utils/formatDuration';
import { activityIcon, type UISession } from '../../../utils/trainingWeek';

/** One tile of the week strip: "WK 3" and a dot for its state. */
export const WeekTile = React.memo(function WeekTile({
  week,
  isSelected,
  onSelect,
}: {
  week: TrainingWeek;
  isSelected: boolean;
  onSelect: (weekId: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isCurrent = week.status === 'current' || week.status === 'active';
  const dotColor =
    week.status === 'completed'
      ? colors.success
      : week.status === 'skipped'
        ? colors.textMuted
        : isCurrent
          ? colors.white
          : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.weekTile,
        {
          backgroundColor: isCurrent ? colors.textPrimary : colors.cardBackground,
          borderColor: isSelected ? colors.primary : colors.borderLight,
        },
      ]}
      onPress={() => onSelect(week.id)}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.weekTileLabel, { color: isCurrent ? colors.background : colors.textMuted }]}
      >
        {t('training.weeksList.weekShort')}
      </Text>
      <Text
        style={[
          styles.weekTileNumber,
          { color: isCurrent ? colors.background : colors.textPrimary },
        ]}
      >
        {week.week_number}
      </Text>
      <View
        style={[
          styles.weekTileDot,
          dotColor === 'transparent'
            ? { borderWidth: 1.5, borderColor: colors.border }
            : { backgroundColor: dotColor },
        ]}
      />
    </TouchableOpacity>
  );
});

/** One planned or done session of the selected week. */
export const SessionRow = React.memo(function SessionRow({ session }: { session: UISession }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const done = session.status === 'completed';
  const skipped = session.status === 'skipped';
  const duration = session.durationMinutes
    ? formatDurationCompact(session.durationMinutes * 60)
    : null;
  const statusColor = done ? colors.success : skipped ? colors.textMuted : colors.textSecondary;
  const statusLabel = done
    ? t('training.weeksList.sessionStatus.done')
    : skipped
      ? t('training.weeksList.sessionStatus.skipped')
      : t('training.weeksList.sessionStatus.planned');

  return (
    <View style={styles.session}>
      <View
        style={[
          styles.sessionIcon,
          { backgroundColor: done ? colors.success : colors.primary + '18' },
        ]}
      >
        <Ionicons
          name={done ? 'checkmark' : activityIcon(session.iconType, session.sportSlug)}
          size={18}
          color={done ? colors.white : colors.primary}
        />
      </View>
      <View style={styles.sessionText}>
        <Text style={[styles.sessionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {session.title}
        </Text>
        {!!session.detail && (
          <Text style={[styles.sessionDetail, { color: colors.textSecondary }]} numberOfLines={1}>
            {session.detail}
          </Text>
        )}
      </View>
      <View style={styles.sessionMeta}>
        {duration && (
          <Text
            style={[
              styles.sessionDuration,
              { color: done ? colors.textMuted : colors.textPrimary },
              done && styles.strikethrough,
            ]}
          >
            {duration}
          </Text>
        )}
        <Text style={[styles.sessionStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  weekTile: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  weekTileLabel: {
    fontSize: msFont(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekTileNumber: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  weekTileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sessionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sessionDetail: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  sessionMeta: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  sessionStatus: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
});
