import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../Card';
import { useTheme } from '../../hooks/useTheme';
import { fontSize, spacing } from '../../theme';
import type { Event } from '../../types/api';
import { formatDate } from '../../utils/dateFormat';

/** A "most km in a period" event: several activities summed over its window. */
function isPeriodChallenge(event: Event): boolean {
  return (
    !!event.allow_multiple_activities &&
    (event.ranking_mode === 'most_distance' || event.ranking_mode === 'most_elevation')
  );
}

/**
 * Period challenges join activities on their own: the server links every
 * finished activity of a registered participant — same sport, started inside
 * the window — until the results are finalized. Saying so here saves the
 * athlete from pinning the event to every workout.
 */
export function EventPeriodChallengeNote({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!isPeriodChallenge(event) || event.results_finalized) return null;

  const params = {
    sport: event.sport_type?.name ?? '',
    from: formatDate(new Date(event.starts_at), 'PP'),
    to: formatDate(new Date(event.ends_at), 'PP'),
  };

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="infinite-outline" size={20} color={colors.primary} />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('eventDetail.periodChallenge.title')}
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            {t(
              event.is_registered
                ? 'eventDetail.periodChallenge.registered'
                : 'eventDetail.periodChallenge.notRegistered',
              params,
            )}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: 2,
  },
});
