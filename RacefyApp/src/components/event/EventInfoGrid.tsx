import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { fontSize, spacing } from '../../theme';
import { formatCutoff, rankingModeLabel } from './eventFormat';
import type { Event } from '../../types/api';

interface InfoCell {
  label: string;
  value: string;
  unit?: string;
}

/** 2-column key/value grid: date, start, distance, ascent, entry, level, cut-off, ranking. */
export function EventInfoGrid({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort, formatElevation } = useUnits();
  const { event_entry_fee: entryFeeEnabled } = useFeatureFlags();

  const cells = useMemo<InfoCell[]>(() => {
    const start = new Date(event.starts_at);
    const list: InfoCell[] = [
      { label: t('eventInfo.date', 'Date'), value: format(start, 'd MMM yyyy') },
      { label: t('eventInfo.start', 'Start'), value: format(start, 'HH:mm') },
    ];

    const distanceMeters = event.distance ?? event.route?.distance ?? null;
    if (distanceMeters != null) {
      list.push({
        label: t('eventInfo.distance', 'Distance'),
        value: formatDistanceShort(distanceMeters),
      });
    }

    const ascent = event.target_elevation ?? event.route?.elevation_gain ?? null;
    if (ascent != null && ascent > 0) {
      list.push({ label: t('eventInfo.ascent', 'Ascent'), value: formatElevation(ascent) });
    }

    if (entryFeeEnabled && event.entry_fee != null) {
      list.push({
        label: t('eventInfo.entry', 'Entry'),
        value: event.entry_fee === 0 ? t('eventDetail.free', 'Free') : `$${event.entry_fee}`,
      });
    }

    list.push({ label: t('eventInfo.level', 'Level'), value: t(`difficulty.${event.difficulty}`) });

    const cutoff = formatCutoff(event.time_limit);
    if (cutoff) {
      list.push({ label: t('eventInfo.cutoff', 'Cut-off'), value: cutoff });
    }

    const ranking = rankingModeLabel(event.ranking_mode, t);
    if (ranking) {
      list.push({ label: t('eventInfo.ranking', 'Ranking'), value: ranking });
    }

    return list;
  }, [event, t, formatDistanceShort, formatElevation, entryFeeEnabled]);

  return (
    <Card style={styles.card} noPadding>
      <View style={styles.grid}>
        {cells.map((cell, index) => {
          const isLeft = index % 2 === 0;
          return (
            <View
              key={cell.label}
              style={[
                styles.cell,
                {
                  borderTopColor: colors.border,
                  borderLeftColor: colors.border,
                  borderTopWidth: index > 1 ? StyleSheet.hairlineWidth : 0,
                  borderLeftWidth: isLeft ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {cell.label.toUpperCase()}
              </Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{cell.value}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '50%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
