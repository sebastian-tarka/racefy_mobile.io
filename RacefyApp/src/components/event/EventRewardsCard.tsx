import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { rankingModeLabel } from './eventFormat';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../theme';
import type { Event, EventCoupon, EventPrize } from '../../types/api';

interface Props {
  event: Event;
}

interface Line {
  key: string;
  place: string;
  detail: string;
  points: number | null;
}

/** Ordinal label for a finishing place, falling back to "4th" style. */
function placeLabel(place: number, t: ReturnType<typeof useTranslation>['t']): string {
  const key = `rewards.position.${place}`;
  const translated = t(key, { defaultValue: '' });
  return translated || `${place}.`;
}

/**
 * What is on the line, above the register button
 * (design "Racefy v2" → event detail rewards block).
 *
 * Prizes and coupons were carried by the API and rendered nowhere: the only
 * way to learn what an event was worth was to finish it. Points, prizes and
 * coupons are grouped by finishing place because that is how the organiser
 * assigns them, and how anyone reads them.
 */
export function EventRewardsCard({ event }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const rewards = event.point_rewards;
  const prizes: EventPrize[] = event.prizes ?? [];
  const coupons: EventCoupon[] = event.coupons ?? [];
  const ranking = rankingModeLabel(event.ranking_mode, t);

  const byPlace = new Map<number, { prize?: EventPrize; coupon?: EventCoupon }>();
  for (const prize of prizes) {
    byPlace.set(prize.place, { ...byPlace.get(prize.place), prize });
  }
  for (const coupon of coupons) {
    byPlace.set(coupon.place, { ...byPlace.get(coupon.place), coupon });
  }

  const pointsFor = (place: number): number | null => {
    if (place === 1) return rewards?.first_place ?? null;
    if (place === 2) return rewards?.second_place ?? null;
    if (place === 3) return rewards?.third_place ?? null;
    return null;
  };

  const places = [...new Set([...byPlace.keys(), 1, 2, 3])]
    .filter((place) => byPlace.has(place) || pointsFor(place) != null)
    .sort((a, b) => a - b);

  const lines: Line[] = places.map((place) => {
    const slot = byPlace.get(place);
    const detail = [slot?.prize?.name, slot?.coupon?.title].filter(Boolean).join(' · ');
    return {
      key: `place-${place}`,
      place: placeLabel(place, t),
      detail,
      points: pointsFor(place),
    };
  });

  if (rewards?.finisher) {
    lines.push({
      key: 'finisher',
      place: t('events.rewards.finisher'),
      detail: '',
      points: rewards.finisher,
    });
  }

  if (lines.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <Ionicons name="trophy" size={16} color={colors.warning} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('events.rewards.title')}
        </Text>
        {!!ranking && (
          <Text style={[styles.mode, { color: colors.textMuted }]} numberOfLines={1}>
            {ranking}
          </Text>
        )}
      </View>

      {lines.map((line, i) => (
        <View
          key={line.key}
          style={[i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }, styles.line]}
        >
          <Text style={[styles.place, { color: colors.textSecondary }]}>{line.place}</Text>
          <Text style={[styles.detail, { color: colors.textPrimary }]} numberOfLines={2}>
            {line.detail || t('events.rewards.pointsOnly')}
          </Text>
          {line.points != null && (
            <Text style={[styles.points, { color: colors.primaryDark }]}>
              {t('events.stakes.points', { count: line.points })}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },
  title: {
    flex: 1,
    fontSize: msFont(14),
    fontWeight: '700',
  },
  mode: {
    flexShrink: 1,
    fontSize: msFont(11),
    fontWeight: '600',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
  },
  place: {
    minWidth: 56,
    fontSize: msFont(11.5),
    fontWeight: '700',
  },
  detail: {
    flex: 1,
    fontSize: msFont(13),
    fontWeight: '600',
  },
  points: {
    fontSize: msFont(13),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
