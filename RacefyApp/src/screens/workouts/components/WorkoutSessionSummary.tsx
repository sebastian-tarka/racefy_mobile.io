import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components';
import { StrengthFeedPanel, hasStrengthSession } from '../../../components/strength';
import { StrengthExerciseCards } from '../../../components/strength/StrengthExerciseCards';
import { StrengthProgressCard } from '../../../components/strength/StrengthProgressCard';
import { api } from '../../../services/api';
import { logger } from '../../../services/logger';
import type { Activity } from '../../../types/api';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, heroColors, msFont, spacing } from '../../../theme';
import type { WorkoutSession } from '../../../types/workouts';
import { formatTime } from '../../../utils/formatters';

interface Props {
  session: WorkoutSession;
  activityId: number | null;
  elapsedSeconds: number;
  /** Changes still waiting for the network (session closed offline). */
  pendingCount: number;
  onResumeSkipped: () => void;
  onOpenActivity: (activityId: number) => void;
  onBack: () => void;
}

/**
 * After the session: done (sets, volume, time) or skipped (with a way back).
 *
 * Once the activity exists, the screen shows what the feed will show — the
 * set mosaic and volume, progress against last time and every exercise set by
 * set (`strength_session` from GET /activities/{id}) — and the name the server
 * gave the workout ("Strength training · Back" for a free-form one).
 */
export function WorkoutSessionSummary({
  session,
  activityId,
  elapsedSeconds,
  pendingCount,
  onResumeSkipped,
  onOpenActivity,
  onBack,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const skipped = session.status === 'skipped';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(activityId != null);

  useEffect(() => {
    if (activityId == null) return;
    let alive = true;
    setLoadingActivity(true);
    api
      .getActivity(activityId)
      .then((a) => alive && setActivity(a))
      .catch((error) => logger.debug('api', 'Summary: activity not loaded', { activityId, error }))
      .finally(() => alive && setLoadingActivity(false));
    return () => {
      alive = false;
    };
  }, [activityId]);

  const strength = hasStrengthSession(activity?.strength_session)
    ? activity!.strength_session!
    : null;
  const summary: [string, string][] = [
    [
      t('strengthPlans.complete.sets'),
      `${session.stats?.sets_completed ?? 0}/${session.stats?.sets_total ?? 0}`,
    ],
    [t('strengthPlans.complete.volume'), `${Math.round(session.stats?.volume_kg ?? 0)} kg`],
    [t('strengthPlans.complete.time'), formatTime(session.duration_seconds ?? elapsedSeconds)],
  ];

  return (
    <>
      <View style={styles.summaryHero}>
        <View
          style={[
            styles.summaryIcon,
            { backgroundColor: skipped ? heroColors.surfaceStrong : heroColors.primary },
          ]}
        >
          <Ionicons
            name={skipped ? 'remove-circle-outline' : 'checkmark'}
            size={24}
            color="#ffffff"
          />
        </View>
        <Text style={styles.summaryTitle}>
          {t(
            skipped ? 'strengthPlans.complete.skippedTitle' : 'strengthPlans.complete.summaryTitle',
          )}
        </Text>
        <Text style={styles.summarySubtitle} numberOfLines={2}>
          {activity?.title ?? session.workout_name}
        </Text>
      </View>

      <View style={[styles.summaryBody, { backgroundColor: colors.background }]}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!skipped && (
            <View style={styles.summaryStats}>
              {summary.map(([label, value]) => (
                <View
                  key={label}
                  style={[
                    styles.summaryCard,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {!skipped && pendingCount > 0 && (
            <View
              style={[
                styles.offlineNotice,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.offlineNoticeText, { color: colors.textSecondary }]}>
                {t('strengthPlans.session.offline.completeQueued')}
              </Text>
            </View>
          )}

          {!skipped && loadingActivity && (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
          )}

          {strength && (
            <>
              <StrengthFeedPanel
                session={strength}
                onPress={activityId != null ? () => onOpenActivity(activityId) : undefined}
              />
              <StrengthProgressCard session={strength} style={styles.card} />
              <StrengthExerciseCards session={strength} style={styles.card} />
            </>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {skipped && (
            <Button
              title={t('strengthPlans.schedule.resumeSkipped')}
              onPress={onResumeSkipped}
              fullWidth
            />
          )}
          {activityId != null && (
            <Button
              title={t('strengthPlans.complete.openActivity')}
              onPress={() => onOpenActivity(activityId)}
              fullWidth
            />
          )}
          <Button
            title={t(
              session.is_freeform
                ? 'strengthPlans.complete.close'
                : 'strengthPlans.complete.backToPlan',
            )}
            variant="outline"
            onPress={onBack}
            fullWidth
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryBody: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  summaryHero: {
    backgroundColor: heroColors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summarySubtitle: {
    color: heroColors.inkSoft,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  summaryTitle: {
    color: heroColors.ink,
    fontSize: msFont(24),
    fontWeight: '700',
    letterSpacing: -0.6,
    marginTop: spacing.md,
  },
});
