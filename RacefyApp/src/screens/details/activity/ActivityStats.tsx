import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, PremiumTeaser } from '../../../components';
import { StrengthMetricStrip, strengthMetrics } from '../../../components/strength';
import { useSubscription } from '../../../hooks/useSubscription';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import { fontSize, spacing } from '../../../theme';
import type { Activity } from '../../../types/api';
import { formatDuration } from '../../../utils/formatDuration';
import { paceSeconds, visibleMovingTime } from '../../../utils/movingTime';

type StrengthSession = NonNullable<Activity['strength_session']>;

/**
 * The headline numbers: distance · time · pace, or — for an activity logged
 * from a strength session — the strength metric strip.
 */
export function ActivityMainStats({
  activity,
  strength,
}: {
  activity: Activity;
  strength: StrengthSession | null;
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance, formatPaceWithUnit, units } = useUnits();
  const movingTime = visibleMovingTime(activity);

  return (
    <>
      {strength ? (
        <Card style={styles.statsCard}>
          <StrengthMetricStrip
            items={strengthMetrics(strength, activity.duration, {
              withVolume: true,
              formatDuration,
              t,
              locale: i18n.language,
              units,
            })}
          />
        </Card>
      ) : (
        <Card style={styles.statsCard}>
          <View style={styles.mainStats}>
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>
                {formatDistance(activity.distance)}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                {t('activityDetail.distance')}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>
                {formatDuration(activity.duration)}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                {t('activityDetail.duration')}
              </Text>
              {movingTime != null && (
                <Text style={[styles.movingTime, { color: colors.textMuted }]}>
                  {t('activityDetail.movingTime', { time: formatDuration(movingTime) })}
                </Text>
              )}
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.mainStatItem}>
              <Text style={[styles.mainStatValue, { color: colors.textPrimary }]}>
                {formatPaceWithUnit(activity.distance, paceSeconds(activity))}
              </Text>
              <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>
                {t('activityDetail.pace')}
              </Text>
            </View>
          </View>
        </Card>
      )}
    </>
  );
}

/**
 * Plus/Pro: calories, ascent, speeds, heart rate and where the heart-rate data
 * came from. Free sees a teaser instead.
 */
export function ActivityDetailedStats({ activity }: { activity: Activity }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { canUse } = useSubscription();
  const { formatSpeed, formatElevation } = useUnits();
  const fmtSpeed = (metersPerSecond: number | null): string =>
    metersPerSecond ? formatSpeed(metersPerSecond) : '--';

  return (
    <>
      {/* Secondary Stats - Detailed Metrics */}
      {canUse('advanced_stats') ? (
        (activity.calories ||
          activity.elevation_gain ||
          activity.avg_speed ||
          activity.max_speed ||
          activity.avg_heart_rate ||
          activity.max_heart_rate) && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('activityDetail.detailedStats')}
            </Text>
            <View style={styles.statsGrid}>
              {activity.calories !== null && activity.calories > 0 && (
                <View style={styles.statGridItem}>
                  <Ionicons name="flame-outline" size={22} color={colors.primary} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {activity.calories}
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.calories')}
                  </Text>
                </View>
              )}
              {activity.elevation_gain !== null && activity.elevation_gain > 0 && (
                <View style={styles.statGridItem}>
                  <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {formatElevation(activity.elevation_gain)}
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.elevationGain')}
                  </Text>
                </View>
              )}
              {activity.avg_speed !== null && (
                <View style={styles.statGridItem}>
                  <Ionicons name="speedometer-outline" size={22} color={colors.primary} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {fmtSpeed(activity.avg_speed)}
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.avgSpeed')}
                  </Text>
                </View>
              )}
              {activity.max_speed !== null && (
                <View style={styles.statGridItem}>
                  <Ionicons name="flash-outline" size={22} color={colors.primary} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {fmtSpeed(activity.max_speed)}
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.maxSpeed')}
                  </Text>
                </View>
              )}
              {activity.avg_heart_rate !== null && (
                <View style={styles.statGridItem}>
                  <Ionicons name="heart-outline" size={22} color={colors.error} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {activity.avg_heart_rate} bpm
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.avgHeartRate')}
                  </Text>
                </View>
              )}
              {activity.max_heart_rate !== null && (
                <View style={styles.statGridItem}>
                  <Ionicons name="heart" size={22} color={colors.error} />
                  <Text style={[styles.statGridValue, { color: colors.textPrimary }]}>
                    {activity.max_heart_rate} bpm
                  </Text>
                  <Text style={[styles.statGridLabel, { color: colors.textMuted }]}>
                    {t('activityDetail.maxHeartRate')}
                  </Text>
                </View>
              )}
            </View>
            {activity.hr_data_source && (
              <View style={styles.hrSourceBadge}>
                <Ionicons name="watch-outline" size={14} color={colors.primary} />
                <Text style={[styles.hrSourceText, { color: colors.primary }]}>
                  {activity.hr_data_source === 'health_connect'
                    ? t('settings.healthSync.hrFromHealthConnect')
                    : t('settings.healthSync.hrFromAppleHealth')}
                </Text>
              </View>
            )}
          </Card>
        )
      ) : (
        <PremiumTeaser feature="advanced_stats" style={styles.section} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  hrSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  hrSourceText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  movingTime: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  mainStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  statDivider: {
    width: 1,
    marginVertical: spacing.xs,
  },
  statGridItem: {
    width: '50%',
    paddingVertical: spacing.sm,
    alignItems: 'flex-start',
  },
  statGridLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statGridValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
