import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BadgeSheet,
  BadgeTile,
  EmptyState,
  RewardCard,
  ScreenContainer,
  ScreenHeader,
} from '../../components';
import { useTabBarPadding } from '../../navigation/useTabBarPadding';
import { useRewards } from '../../hooks/useRewards';
import { useTheme } from '../../hooks/useTheme';
import { borderRadius, msFont, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { BadgeReward } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Rewards'>;

type Filter = 'all' | 'points' | 'coupons' | 'badges' | 'prizes';

const FILTERS: Filter[] = ['all', 'points', 'coupons', 'badges', 'prizes'];
const BADGE_COLUMNS = 3;

/**
 * Everything the athlete has won (design "Racefy v2" → RewardsScreen).
 *
 * The question it answers: "what have I actually won, and is any of it about
 * to expire?" — which is why coupons come first and lead with their code and
 * expiry date. Badges are a grid rather than a list: a cabinet is something
 * you look at, and nine rows of text is not.
 *
 * The same rewards are also reachable from the Events tab. This screen exists
 * because nothing on the profile pointed at them, and the profile is where
 * anyone looks for what they have earned.
 */
export function RewardsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tabBarPaddingBottom = useTabBarPadding();
  const { badges, coupons, prizes, points, totals, isLoading, refetch } = useRewards();

  const [filter, setFilter] = useState<Filter>('all');
  const [openBadge, setOpenBadge] = useState<BadgeReward | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const shows = (kind: Filter) => filter === 'all' || filter === kind;
  const isEmpty =
    !isLoading && badges.length + coupons.length + prizes.length + points.length === 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Keep the last grid row left-aligned with the ones above it.
  const badgeFillers = (BADGE_COLUMNS - (badges.length % BADGE_COLUMNS)) % BADGE_COLUMNS;

  return (
    <ScreenContainer glow={false}>
      <ScreenHeader title={t('rewards.title')} showBack onBack={() => navigation.goBack()} />

      {isLoading && !isRefreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarPaddingBottom }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Aggregate totals — the server sends these alongside the list. */}
          <View
            style={[
              styles.totals,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            {(
              [
                [
                  t('rewards.stats.totalPoints'),
                  totals.points.toLocaleString(),
                  colors.primaryDark,
                ],
                [t('rewards.stats.totalBadges'), String(totals.badges), colors.ai],
                [t('rewards.stats.totalCoupons'), String(totals.coupons), colors.warning],
              ] as const
            ).map(([label, value, tint], i) => (
              <View
                key={label}
                style={[
                  styles.total,
                  i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
                ]}
              >
                <Text style={[styles.totalValue, { color: tint }]}>{value}</Text>
                <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          {!isEmpty && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              style={styles.filtersScroll}
            >
              {FILTERS.map((id) => {
                const active = filter === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.textPrimary : 'transparent',
                        borderColor: active ? colors.textPrimary : colors.border,
                      },
                    ]}
                    onPress={() => setFilter(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.white : colors.textSecondary },
                      ]}
                    >
                      {t(`rewards.filters.${id}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {isEmpty && (
            <EmptyState
              icon="trophy-outline"
              title={t('rewards.noRewards')}
              message={t('rewards.noRewardsMessage')}
            />
          )}

          {shows('coupons') && coupons.length > 0 && (
            <Section label={t('rewards.filters.coupons')} hint={t('rewards.sections.couponsHint')}>
              {coupons.map((reward) => (
                <RewardCard key={`coupon-${reward.id}`} reward={reward} />
              ))}
            </Section>
          )}

          {shows('badges') && badges.length > 0 && (
            <Section
              label={t('rewards.cabinet.label', { count: badges.length })}
              hint={t('rewards.sections.badgesHint')}
            >
              <View
                style={[
                  styles.badgeCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
              >
                <View style={styles.badgeGrid}>
                  {badges.map((reward) => (
                    <View key={reward.id} style={styles.badgeCell}>
                      <BadgeTile reward={reward} onPress={setOpenBadge} />
                    </View>
                  ))}
                  {Array.from({ length: badgeFillers }).map((_, i) => (
                    <View key={`filler-${i}`} style={styles.badgeCell} />
                  ))}
                </View>
              </View>
            </Section>
          )}

          {shows('prizes') && prizes.length > 0 && (
            <Section label={t('rewards.filters.prizes')}>
              {prizes.map((reward) => (
                <RewardCard key={`prize-${reward.id}`} reward={reward} />
              ))}
            </Section>
          )}

          {shows('points') && (
            <Section label={t('rewards.filters.points')}>
              <TouchableOpacity
                style={[
                  styles.pointsRow,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                ]}
                onPress={() => navigation.navigate('PointHistory')}
                activeOpacity={0.8}
              >
                <View style={[styles.pointsIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="stats-chart" size={20} color={colors.primaryDark} />
                </View>
                <View style={styles.pointsBody}>
                  <Text style={[styles.pointsValue, { color: colors.textPrimary }]}>
                    {totals.points.toLocaleString()}
                  </Text>
                  <Text style={[styles.pointsHint, { color: colors.textSecondary }]}>
                    {t('rewards.sections.pointsRow')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Section>
          )}
        </ScrollView>
      )}

      <BadgeSheet reward={openBadge} onClose={() => setOpenBadge(null)} />
    </ScreenContainer>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
        {!!hint && (
          <Text style={[styles.sectionHint, { color: colors.textMuted }]} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  totals: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  total: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
  },
  totalValue: {
    fontSize: msFont(21),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    fontSize: msFont(10),
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  filtersScroll: {
    marginHorizontal: -spacing.lg,
    marginTop: spacing.md,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    gap: 7,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: msFont(12),
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: msFont(10.5),
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  sectionHint: {
    flexShrink: 1,
    fontSize: msFont(11),
    textAlign: 'right',
  },
  badgeCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xl,
  },
  badgeCell: {
    width: `${100 / BADGE_COLUMNS}%`,
    paddingHorizontal: spacing.xs + 1,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: spacing.md + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  pointsIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsBody: {
    flex: 1,
    minWidth: 0,
  },
  pointsValue: {
    fontSize: msFont(20),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  pointsHint: {
    fontSize: msFont(11.5),
    marginTop: 1,
  },
});
