import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { EventSeriesStatus, EventSeriesSummary } from '../../types/api';
import { formatDate } from '../../utils/dateFormat';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../Button';

interface EventSeriesCardProps {
  series: EventSeriesSummary;
  occurrenceNumber: number | null | undefined;
  /** After pause / resume / end, so the form can reflect it. */
  onStatusChange: (status: EventSeriesStatus) => void;
}

/**
 * Edit form of one edition of a recurring event. The API can't edit the rule or
 * the template yet, so this says plainly that the form changes this edition only,
 * and offers what the series endpoints do support: pause, resume, end.
 */
export function EventSeriesCard({
  series,
  occurrenceNumber,
  onStatusChange,
}: EventSeriesCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'pause' | 'resume' | 'end' | null>(null);

  const run = async (action: 'pause' | 'resume' | 'end') => {
    setBusy(action);
    try {
      if (action === 'pause') await api.pauseEventSeries(series.id);
      if (action === 'resume') await api.resumeEventSeries(series.id);
      if (action === 'end') await api.endEventSeries(series.id);
      onStatusChange(action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'ended');
    } catch (error) {
      logger.error('api', `Event series ${action} failed`, { error, seriesId: series.id });
      Alert.alert(t('common.error'), getErrorMessage(error) || t('eventForm.series.actionFailed'));
    } finally {
      setBusy(null);
    }
  };

  const confirmEnd = () =>
    Alert.alert(t('eventForm.series.endTitle'), t('eventForm.series.endBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('eventForm.series.end'), style: 'destructive', onPress: () => run('end') },
    ]);

  const statusColor =
    series.status === 'active'
      ? colors.primary
      : series.status === 'paused'
        ? colors.warning
        : colors.textMuted;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Ionicons name="repeat" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {occurrenceNumber
            ? t('eventForm.series.edition', { number: occurrenceNumber })
            : t('eventForm.series.title')}
        </Text>
        <View style={[styles.status, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(`eventForm.series.status.${series.status}`)}
          </Text>
        </View>
      </View>

      <Text style={[styles.summary, { color: colors.textPrimary }]}>{series.summary}</Text>
      {series.status === 'active' && !!series.next_occurrence_at && (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t('eventForm.series.next', { date: formatDate(series.next_occurrence_at, 'PPp') })}
        </Text>
      )}
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {t('eventForm.series.thisEditionOnly')}
      </Text>

      {series.status !== 'ended' && (
        <View style={styles.actions}>
          {series.status === 'active' ? (
            <Button
              title={t('eventForm.series.pause')}
              variant="outline"
              onPress={() => run('pause')}
              loading={busy === 'pause'}
              disabled={busy != null}
              style={styles.action}
            />
          ) : (
            <Button
              title={t('eventForm.series.resume')}
              variant="outline"
              onPress={() => run('resume')}
              loading={busy === 'resume'}
              disabled={busy != null}
              style={styles.action}
            />
          )}
          <Button
            title={t('eventForm.series.end')}
            variant="secondary"
            onPress={confirmEnd}
            loading={busy === 'end'}
            disabled={busy != null}
            style={styles.action}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  status: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  summary: {
    fontSize: fontSize.md,
  },
  meta: {
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
