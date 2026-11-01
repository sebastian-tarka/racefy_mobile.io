import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { rankingModeLabel } from './eventFormat';
import { EventRewardsSheet, type RewardGroup, type RewardItem } from './EventRewardsSheet';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../theme';
import type { Event } from '../../types/api';

interface Props {
  event: Event;
}

/** `place` on a prize or coupon: 0 means every finisher gets it (API PrizeService). */
const EVERY_FINISHER = 0;

/** Ordinal label for a finishing place, falling back to "4th" style. */
function placeLabel(place: number, t: ReturnType<typeof useTranslation>['t']): string {
  const key = `rewards.position.${place}`;
  const translated = t(key, { defaultValue: '' });
  return translated || `${place}.`;
}

function itemTitle(item: RewardItem): string {
  return item.kind === 'prize' ? item.prize.name : item.coupon.title;
}

/**
 * What is on the line, above the register button
 * (design "Racefy v2" → event detail rewards block).
 *
 * Prizes and coupons were carried by the API and rendered nowhere: the only
 * way to learn what an event was worth was to finish it. Points, prizes and
 * coupons are grouped by finishing place because that is how the organiser
 * assigns them, and how anyone reads them.
 *
 * A place can hold several rewards (a sponsor's three coupons for every
 * finisher), so a line shows the first and counts the rest; tapping it opens
 * the full list. `place: 0` is "every finisher", so it joins the finisher line.
 */
export function EventRewardsCard({ event }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const rewards = event.point_rewards;
  const ranking = rankingModeLabel(event.ranking_mode, t);

  const groups = useMemo<RewardGroup[]>(() => {
    const byPlace = new Map<number, RewardItem[]>();
    const add = (place: number, item: RewardItem) =>
      byPlace.set(place, [...(byPlace.get(place) ?? []), item]);
    for (const prize of event.prizes ?? []) add(prize.place, { kind: 'prize', prize });
    for (const coupon of event.coupons ?? []) add(coupon.place, { kind: 'coupon', coupon });

    const pointsFor = (place: number): number | null => {
      if (place === 1) return rewards?.first_place ?? null;
      if (place === 2) return rewards?.second_place ?? null;
      if (place === 3) return rewards?.third_place ?? null;
      return null;
    };

    const places = [...new Set([...byPlace.keys(), 1, 2, 3])]
      .filter((place) => place !== EVERY_FINISHER)
      .filter((place) => byPlace.has(place) || pointsFor(place) != null)
      .sort((a, b) => a - b);

    const result: RewardGroup[] = places.map((place) => ({
      key: `place-${place}`,
      label: placeLabel(place, t),
      points: pointsFor(place),
      items: byPlace.get(place) ?? [],
    }));

    const forEveryone = byPlace.get(EVERY_FINISHER) ?? [];
    if (rewards?.finisher || forEveryone.length > 0) {
      result.push({
        key: 'finisher',
        label: t('events.rewards.finisher'),
        points: rewards?.finisher || null,
        items: forEveryone,
      });
    }
    return result;
  }, [event.prizes, event.coupons, rewards, t]);

  if (groups.length === 0) return null;

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  const hasHidden = groups.some((group) => group.items.length > 1);
  const openSheet = () => setSheetOpen(true);

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

      {groups.map((group, i) => {
        const [first, ...rest] = group.items;
        return (
          <TouchableOpacity
            key={group.key}
            style={[i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }, styles.line]}
            onPress={openSheet}
            disabled={!first}
            activeOpacity={0.7}
          >
            <Text style={[styles.place, { color: colors.textSecondary }]}>{group.label}</Text>
            <View style={styles.detailWrap}>
              <Text style={[styles.detail, { color: colors.textPrimary }]} numberOfLines={2}>
                {first ? itemTitle(first) : t('events.rewards.pointsOnly')}
              </Text>
              {rest.length > 0 && (
                <Text style={[styles.more, { color: colors.primaryDark }]}>
                  {t('events.rewards.moreCount', { count: rest.length })}
                </Text>
              )}
            </View>
            {group.points != null && (
              <Text style={[styles.points, { color: colors.primaryDark }]}>
                {t('events.stakes.points', { count: group.points })}
              </Text>
            )}
            {!!first && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
          </TouchableOpacity>
        );
      })}

      {hasHidden && (
        <TouchableOpacity
          style={[styles.showAll, { borderTopColor: colors.border }]}
          onPress={openSheet}
          activeOpacity={0.7}
        >
          <Text style={[styles.showAllText, { color: colors.primaryDark }]}>
            {t('events.rewards.showAll', { count: totalItems })}
          </Text>
        </TouchableOpacity>
      )}

      <EventRewardsSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} groups={groups} />
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
  detailWrap: {
    flex: 1,
    gap: 2,
  },
  detail: {
    fontSize: msFont(13),
    fontWeight: '600',
  },
  more: {
    fontSize: msFont(11.5),
    fontWeight: '700',
  },
  showAll: {
    borderTopWidth: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
  },
  showAllText: {
    fontSize: msFont(13),
    fontWeight: '700',
  },
  points: {
    fontSize: msFont(13),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
