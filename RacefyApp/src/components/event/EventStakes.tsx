import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { rankingModeLabel } from './eventFormat';
import { useTheme } from '../../hooks/useTheme';
import { msFont } from '../../theme';
import type { Event } from '../../types/api';

interface Props {
  event: Pick<Event, 'ranking_mode' | 'point_rewards' | 'prizes' | 'coupons'>;
  /** On a photo or other dark ground. */
  onDark?: boolean;
}

/**
 * What an event is worth, and how the result is scored
 * (design "Racefy v2" → EventStakes).
 *
 * This is the information that decides whether anyone registers, and it used
 * to live below the description on the detail screen — that is, after the
 * decision. On the card it arrives before it.
 *
 * Renders nothing when an event carries no rewards and no ranking mode: an
 * empty strip of chips is worse than none.
 */
export function EventStakes({ event, onDark = false }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const topPoints = event.point_rewards?.first_place ?? event.point_rewards?.finisher ?? null;
  const topPrize = event.prizes?.length
    ? [...event.prizes].sort((a, b) => a.place - b.place)[0]
    : null;
  const hasCoupon = !!event.coupons?.length;
  const ranking = rankingModeLabel(event.ranking_mode, t);

  const chips: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (topPoints)
    chips.push({ icon: 'star', label: t('events.stakes.points', { count: topPoints }) });
  if (topPrize) chips.push({ icon: 'trophy', label: topPrize.name });
  if (hasCoupon) chips.push({ icon: 'pricetag', label: t('events.stakes.coupon') });

  if (chips.length === 0 && !ranking) return null;

  const rewardBg = onDark ? 'rgba(255,255,255,0.16)' : colors.warningLight;
  const rewardInk = onDark ? colors.white : '#8a5200';
  const modeBg = onDark ? 'rgba(255,255,255,0.12)' : colors.background;
  const modeInk = onDark ? colors.white : colors.textSecondary;

  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <View key={chip.label} style={[styles.chip, { backgroundColor: rewardBg }]}>
          <Ionicons name={chip.icon} size={12} color={rewardInk} />
          <Text style={[styles.chipText, { color: rewardInk }]} numberOfLines={1}>
            {chip.label}
          </Text>
        </View>
      ))}
      {!!ranking && (
        <View style={[styles.chip, { backgroundColor: modeBg }]}>
          <Ionicons name="flag-outline" size={12} color={modeInk} />
          <Text style={[styles.chipText, styles.modeText, { color: modeInk }]} numberOfLines={1}>
            {ranking}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  chipText: {
    flexShrink: 1,
    fontSize: msFont(11),
    fontWeight: '700',
  },
  modeText: {
    fontWeight: '600',
  },
});
