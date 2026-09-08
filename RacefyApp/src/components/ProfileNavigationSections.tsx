import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileSectionCard } from './ProfileSectionCard';
import { ProfileToolRow } from './ProfileToolRow';
import { TrainingProgramRow } from './Training/TrainingProgramRow';
import { TrainingPlansSheet } from './Training/TrainingPlansSheet';
import { useTheme } from '../hooks/useTheme';
import { useLiveBroadcasts } from '../hooks/useLiveBroadcasts';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { borderRadius, msFont, spacing } from '../theme';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { SubscriptionTier, TrainingProgram } from '../types/api';
import type { UserGoal } from '../types/goals';
import type { WorkoutPlan } from '../types/workouts';

type ProfileNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ProfileNavigationSectionsProps {
  navigation: ProfileNavigation;
  tier: SubscriptionTier;
}

/**
 * The profile's tool list (design "Racefy v2" → ToolGroup / ToolRow).
 *
 * Was seven tiles, each with its own accent colour and a subtitle describing
 * what it linked to. Now two groups of rows in one accent family, and every row
 * says what it holds right now — the counts are what give anyone a reason to
 * open them. The active training programme keeps its rich card above the
 * groups: it is live content, not a shortcut.
 */
export function ProfileNavigationSections({ navigation, tier }: ProfileNavigationSectionsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [goals, setGoals] = useState<UserGoal[] | null>(null);
  const [strengthPlans, setStrengthPlans] = useState<WorkoutPlan[] | null>(null);
  const [routeCount, setRouteCount] = useState<number | null>(null);
  // `total` (server-side), not the page length — the list is paginated at 20.
  const { total: liveCount } = useLiveBroadcasts();

  const isFree = tier === 'free';

  const loadPrograms = useCallback(async () => {
    try {
      const result = await api.getCurrentPrograms();
      setPrograms(result);
    } catch (error) {
      logger.error('training', 'Failed to load training programs', { error });
      setPrograms([]);
    } finally {
      setLoadingTraining(false);
    }
  }, []);

  /**
   * The status lines. Each failure is silent and leaves the row on its plain
   * description — a tool list must not turn into an error report.
   */
  const loadStatuses = useCallback(async () => {
    const [goalsResult, plansResult, routesResult] = await Promise.allSettled([
      api.listGoals(),
      api.listWorkoutPlans(),
      api.getRoutes({ page: 1, per_page: 1 }),
    ]);
    if (goalsResult.status === 'fulfilled') setGoals(goalsResult.value);
    if (plansResult.status === 'fulfilled') setStrengthPlans(plansResult.value);
    if (routesResult.status === 'fulfilled') {
      setRouteCount(routesResult.value.meta?.total ?? routesResult.value.data.length);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPrograms();
      void loadStatuses();
    }, [loadPrograms, loadStatuses]),
  );

  // Prefer the active program; fall back to the first (e.g. only paused ones exist).
  const activeProgram = programs.find((p) => p.status === 'active') ?? programs[0] ?? null;

  const openWeeks = () => navigation.navigate('TrainingWeeksList');
  const openCalibration = () => navigation.navigate('TrainingCalibration');

  // ── statuses ──────────────────────────────────────────────────────────────
  const activeGoals = goals?.filter((g) => g.is_active) ?? [];
  const goalsStatus = !goals
    ? t('goals.subtitle')
    : activeGoals.length === 0
      ? t('goals.subtitle')
      : t('profile.tools.goalsStatus', {
          count: activeGoals.length,
          percent: Math.round(
            activeGoals.reduce((sum, g) => sum + (g.progress?.percent ?? 0), 0) /
              activeGoals.length,
          ),
        });

  const activeStrengthPlan = strengthPlans?.find((p) => p.status === 'active');
  const strengthStatus = activeStrengthPlan
    ? `${activeStrengthPlan.name} · ${t('strengthPlans.sessionsPerWeek', {
        count: activeStrengthPlan.workouts_count ?? 0,
      })}`
    : t('strengthPlans.subtitle');

  const routesStatus =
    routeCount != null
      ? t('profile.tools.routesStatus', { count: routeCount })
      : t('routes.subtitle');

  const aiReportsStatus = isFree
    ? t('insights.aiReports.premiumRequired')
    : t('insights.aiReports.subtitle');

  const group = (label: string, children: React.ReactNode) => (
    <View style={styles.groupBlock}>
      <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{label.toUpperCase()}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.group}>
      {activeProgram ? (
        <TrainingProgramRow
          program={activeProgram}
          subtitleSuffix={t('training.holdToSwitch')}
          onPress={openWeeks}
          onLongPress={() => setSheetVisible(true)}
          trailing={
            <TouchableOpacity
              style={[styles.switchBtn, { backgroundColor: colors.cardBackgroundHighlight }]}
              onPress={() => setSheetVisible(true)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          }
        />
      ) : (
        <ProfileSectionCard
          icon="fitness"
          accentColor={colors.primary}
          label={t('training.title')}
          subtitle={t('training.subtitle')}
          onPress={openCalibration}
          loading={loadingTraining}
        />
      )}

      {group(
        t('profile.tools.training'),
        <>
          <ProfileToolRow
            first
            icon="bar-chart"
            tone={colors.info}
            title={t('insights.title')}
            status={t('insights.subtitle')}
            onPress={() => navigation.navigate('Insights')}
          />
          <ProfileToolRow
            icon="flag"
            tone={colors.warning}
            title={t('goals.title')}
            status={goalsStatus}
            onPress={() => navigation.navigate('Goals')}
          />
          <ProfileToolRow
            icon="sparkles"
            tone={colors.ai}
            title={t('insights.aiReports.title')}
            status={aiReportsStatus}
            locked={isFree}
            badge={isFree ? 'PLUS' : undefined}
            onPress={() =>
              isFree
                ? navigation.navigate('Paywall', { feature: 'activity_analysis_reports_monthly' })
                : navigation.navigate('AiActivityReports')
            }
          />
          <ProfileToolRow
            icon="barbell"
            tone="#EF4444"
            title={t('strengthPlans.title')}
            status={strengthStatus}
            onPress={() => navigation.navigate('WorkoutPlans')}
          />
        </>,
      )}

      {group(
        t('profile.tools.community'),
        <>
          {/* The count IS the discovery mechanism — an entry that never says how
              many people are live gives nobody a reason to open it. */}
          <ProfileToolRow
            first
            icon="radio"
            tone={colors.error}
            title={t('live.list.title')}
            status={
              liveCount > 0
                ? t('live.list.countSubtitle', { count: liveCount })
                : t('live.list.emptySubtitle')
            }
            onPress={() => navigation.navigate('LiveBroadcasts')}
          />
          <ProfileToolRow
            icon="shield"
            tone="#8b5cf6"
            title={t('teams.teams')}
            status={t('teams.profileSubtitle')}
            onPress={() => navigation.navigate('TeamsList')}
          />
          <ProfileToolRow
            icon="map"
            tone="#2563EB"
            title={t('routes.title')}
            status={routesStatus}
            onPress={() => navigation.navigate('RouteLibrary')}
          />
        </>,
      )}

      <TrainingPlansSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        programs={programs}
        activeProgramId={activeProgram?.id}
        onSelectProgram={openWeeks}
        onCreateNew={openCalibration}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    gap: spacing.md,
  },
  groupBlock: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.4,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  switchBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
