import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useSubscription } from '../../hooks/useSubscription';
import { useSportTypes } from '../../hooks/useSportTypes';
import { triggerHaptic } from '../../hooks/useHaptics';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { upgradePromptEmitter } from '../../services/upgradePromptEmitter';
import { borderRadius, fontSize, spacing, msFont } from '../../theme';
import { formatDurationCompact } from '../../utils/formatDuration';
import type { OptionListItem } from '../../components';
import {
  Card,
  EmptyState,
  Loading,
  OptionList,
  ScreenContainer,
  ScreenHeader,
} from '../../components';
import { TrainingPlansSheet } from '../../components/Training/TrainingPlansSheet';
import { PlanWarningsBanner } from '../../components/Training/PlanWarningsBanner';
import { ProgramSettingsModal } from './components/ProgramSettingsModal';
import { SessionRow, WeekTile } from './components/WeekListItems';
import { useCoachingHints } from '../../hooks/useCoachingHints';
import {
  defaultWeek,
  programAdherence,
  programProgress,
  weekStats,
} from '../../utils/trainingWeek';
import type { RootStackParamList } from '../../navigation/types';
import type { PausedReason, PlanWarning, TrainingProgram, TrainingWeek } from '../../types/api';
import { getErrorMessage } from '../../utils/errors';
import { formatIntlDate } from '../../utils/dateFormat';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'TrainingWeeksList'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

const fmtDay = (d: string) => formatIntlDate(d, { day: 'numeric', month: 'short' });
const fmtFull = (d: string) =>
  formatIntlDate(d, { day: 'numeric', month: 'short', year: 'numeric' });

export function WeeksListScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { getDistanceValue, getDistanceUnit } = useUnits();
  const fmtDist = useCallback(
    (meters: number) => `${Math.round(getDistanceValue(meters) * 10) / 10} ${getDistanceUnit()}`,
    [getDistanceValue, getDistanceUnit],
  );
  const { sportTypes } = useSportTypes();
  const { features, tier, canUse } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlansSheet, setShowPlansSheet] = useState(false);
  /**
   * Warnings explaining the trade-offs the planner made. Seeded from the
   * `initialize` response we were navigated with, and replaced by `resume`'s
   * own warnings. Dismissible — they describe the plan, not a pending problem.
   */
  const [planWarnings, setPlanWarnings] = useState<PlanWarning[]>(route.params?.warnings ?? []);

  const program = programs.find((p) => p.id === selectedProgramId) ?? programs[0] ?? null;

  const canCreateNew = (() => {
    const limit = features.active_training_programs;
    return limit === -1 || programs.length < limit;
  })();

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const allPrograms = await api.getCurrentPrograms();
        setPrograms(allPrograms);

        // Set initial selection if not yet set
        if (!selectedProgramId && allPrograms.length > 0) {
          setSelectedProgramId(allPrograms[0].id);
        }

        // Load weeks for the selected (or first) program
        const activeProgram = allPrograms.find((p) => p.id === selectedProgramId) ?? allPrograms[0];
        let weeksData: TrainingWeek[] = [];
        if (activeProgram) {
          weeksData = await api.getWeeks();
        }

        setWeeks(weeksData);

        logger.info('training', 'Loaded training programs', {
          programCount: allPrograms.length,
          selectedId: activeProgram?.id,
          totalWeeks: weeksData.length,
        });
      } catch (err) {
        logger.error('training', 'Failed to load training weeks', { error: err });
        setError(getErrorMessage(err) || t('training.errors.loadingFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, selectedProgramId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep the selected week valid; default to the current week.
  useEffect(() => {
    if (weeks.length === 0) {
      setSelectedWeekId(null);
      return;
    }
    if (!weeks.some((w) => w.id === selectedWeekId)) {
      setSelectedWeekId(defaultWeek(weeks)?.id ?? null);
    }
  }, [weeks, selectedWeekId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleSelectProgram = (id: number) => {
    setSelectedProgramId(id);
  };

  // Reload weeks when selected program changes
  useEffect(() => {
    if (selectedProgramId && !loading) {
      loadData(true);
    }
  }, [selectedProgramId]);

  const handleCreateNewProgram = () => {
    if (!canCreateNew) {
      upgradePromptEmitter.emit('show', {
        feature: 'active_training_programs',
        currentTier: tier,
      });
      return;
    }
    navigation.navigate('TrainingCalibration');
  };

  const [actionLoading, setActionLoading] = useState(false);

  const handleAbandonProgram = () => {
    if (!program) return;
    Alert.alert(
      t('training.weeksList.confirmAbandon'),
      t('training.weeksList.confirmAbandonMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('training.weeksList.abandonProgram'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.abandonProgram(program.id);
              logger.info('training', 'Program abandoned', { programId: program.id });
              const remaining = programs.filter((p) => p.id !== program.id);
              if (remaining.length > 0) {
                setSelectedProgramId(remaining[0].id);
                loadData(true);
              } else {
                navigation.goBack();
              }
            } catch (err) {
              logger.error('training', 'Failed to abandon program', { error: err });
              Alert.alert(t('training.errors.title'), getErrorMessage(err));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handlePauseProgram = () => {
    if (!program) return;
    const reasons: PausedReason[] = ['injury', 'vacation', 'burnout', 'other'];
    Alert.alert(
      t('training.weeksList.pauseReasonTitle'),
      t('training.weeksList.confirmPauseMessage'),
      [
        ...reasons.map((reason) => ({
          text: t(`training.weeksList.pauseReasons.${reason}`),
          onPress: async () => {
            setActionLoading(true);
            try {
              await api.pauseProgram(program.id, reason);
              logger.info('training', 'Program paused', { programId: program.id, reason });
              loadData(true);
            } catch (err) {
              logger.error('training', 'Failed to pause program', { error: err });
              Alert.alert(t('training.errors.title'), getErrorMessage(err));
            } finally {
              setActionLoading(false);
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const handleOpenSettings = () => {
    if (program) setShowSettingsModal(true);
  };

  const handleResumeProgram = async () => {
    if (!program) return;
    setActionLoading(true);
    try {
      const result = await api.resumeProgram(program.id);
      logger.info('training', 'Program resumed', {
        programId: program.id,
        regenerated: result.regenerated,
        newProgramId: result.program?.id,
        warnings: result.warnings.map((w) => w.code),
      });

      setPlanWarnings(result.warnings);

      // A long pause against a race date rebuilds the plan: `program` is then a
      // NEW program and the old id is abandoned. Re-point the selection at the
      // returned program instead of assuming the id survived.
      if (result.regenerated && result.program) {
        setSelectedProgramId(result.program.id);
        Alert.alert(
          t('training.weeksList.planRegeneratedTitle'),
          t('training.weeksList.planRegeneratedMessage'),
        );
      }

      loadData(true);
    } catch (err) {
      logger.error('training', 'Failed to resume program', { error: err });
      Alert.alert(t('training.errors.title'), getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const reload = useCallback(() => loadData(true), [loadData]);
  const {
    generating: generatingHints,
    progress: hintsProgress,
    generate: handleGenerateHints,
  } = useCoachingHints({ program, weeks, setWeeks, reload, tier });

  if (loading) {
    return <Loading fullScreen message={t('common.loading')} />;
  }

  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('training.weeksList.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="alert-circle"
          title={t('training.errors.title')}
          message={error}
          actionLabel={t('common.tryAgain')}
          onAction={() => loadData()}
        />
      </ScreenContainer>
    );
  }

  const settingsAction = program ? (
    <TouchableOpacity
      onPress={handleOpenSettings}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
    </TouchableOpacity>
  ) : undefined;

  if (!program) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('training.weeksList.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <EmptyState
          icon="calendar-outline"
          title={t('training.weeksList.empty.title')}
          message={t('training.weeksList.empty.message')}
          actionLabel={t('training.calibration.createProgram')}
          onAction={() => navigation.navigate('TrainingCalibration')}
        />
      </ScreenContainer>
    );
  }

  // ---- Derived program-level values ----
  const { totalWeeks, currentWeekNumber, weeksDone, toGo, overallPercent } =
    programProgress(program);
  const adherence = programAdherence(weeks, fmtDist);

  const isPaused = program.status === 'paused';
  // Deferred plan: dated but not started yet, so the taper lands in race week.
  // Not an error and not a generation state — it just has no active week yet.
  const isScheduled = program.status === 'scheduled';
  const statusColor = isPaused ? colors.warning : isScheduled ? colors.info : colors.success;
  const statusLabel = isPaused
    ? t('training.pausedBadge')
    : isScheduled
      ? t('training.scheduledBadge')
      : t('training.activeBadge');
  const selectedWeek = weeks.find((w) => w.id === selectedWeekId) ?? null;
  const hasOtherPrograms = programs.length > 1;

  const selectedStats = selectedWeek ? weekStats(selectedWeek, fmtDist) : null;
  const selectedIsCurrent = selectedWeek?.status === 'current' || selectedWeek?.status === 'active';

  // ---- Grouped options below the week card ----
  const needsHints = weeks.some((w) => !w.coaching_hint);
  const hintsLocked = !canUse('coaching_hints_bulk');
  const programOptions: OptionListItem[] = [];

  if (hasOtherPrograms) {
    programOptions.push({
      id: 'switch',
      icon: 'swap-horizontal',
      title: t('training.weeksList.switchPlan'),
      subtitle: t('training.weeksList.switchPlanDesc'),
      onPress: () => setShowPlansSheet(true),
    });
  } else if (canCreateNew) {
    programOptions.push({
      id: 'create',
      icon: 'sparkles',
      iconColor: colors.ai,
      title: t('training.createPlan'),
      subtitle: t('training.createPlanDesc'),
      onPress: handleCreateNewProgram,
    });
  }

  programOptions.push({
    id: 'settings',
    icon: 'settings-outline',
    iconColor: colors.textSecondary,
    title: t('training.weeksList.settings'),
    subtitle: program.auto_link_activities
      ? t('training.weeksList.autoLinkEnabled')
      : t('training.weeksList.autoLinkDisabled'),
    onPress: handleOpenSettings,
  });

  if (needsHints) {
    programOptions.push({
      id: 'hints',
      icon: 'bulb-outline',
      iconColor: colors.warning,
      title: t('training.coachingHints.generateButton'),
      subtitle: generatingHints
        ? hintsProgress.total > 0
          ? t('training.coachingHints.generatingProgress', {
              done: hintsProgress.done,
              total: hintsProgress.total,
            })
          : t('training.coachingHints.generating')
        : undefined,
      loading: generatingHints,
      trailing: hintsLocked ? (
        <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.proBadgeText, { color: colors.white }]}>PRO</Text>
        </View>
      ) : undefined,
      onPress: hintsLocked
        ? () =>
            upgradePromptEmitter.emit('show', { feature: 'coaching_hints_bulk', currentTier: tier })
        : handleGenerateHints,
    });
  }

  programOptions.push(
    isPaused
      ? {
          id: 'resume',
          icon: 'play',
          iconColor: colors.success,
          title: t('training.weeksList.resumeProgram'),
          hideChevron: true,
          loading: actionLoading,
          onPress: handleResumeProgram,
        }
      : {
          id: 'pause',
          icon: 'pause',
          iconColor: colors.warning,
          title: t('training.weeksList.pauseProgram'),
          hideChevron: true,
          disabled: actionLoading,
          onPress: handlePauseProgram,
        },
  );

  programOptions.push({
    id: 'abandon',
    icon: 'close-circle',
    iconColor: colors.error,
    titleColor: colors.error,
    title: t('training.weeksList.abandonProgram'),
    hideChevron: true,
    disabled: actionLoading,
    onPress: handleAbandonProgram,
  });

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('training.weeksList.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={settingsAction}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <PlanWarningsBanner warnings={planWarnings} onDismiss={() => setPlanWarnings([])} />

        {/* ---- Program overview card ---- */}
        <Card style={styles.programCard}>
          <View style={styles.programTitleRow}>
            <Text style={[styles.programName, { color: colors.textPrimary }]} numberOfLines={1}>
              {program.name}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '1f' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {isScheduled && (
            <View style={styles.goalRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.goalText, { color: colors.textSecondary }]}>
                {t('training.weeksList.startsOn', { date: fmtFull(program.start_date) })}
              </Text>
            </View>
          )}

          {!!program.template?.name && (
            <View style={styles.goalRow}>
              <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.goalText, { color: colors.textSecondary }]} numberOfLines={1}>
                {program.template.name}
              </Text>
            </View>
          )}

          <View style={styles.overallRow}>
            <Text style={[styles.overallLabel, { color: colors.textSecondary }]}>
              {t('training.weekOfTotal', {
                current: Math.max(1, currentWeekNumber),
                total: totalWeeks,
              })}
            </Text>
            <Text style={[styles.overallPercent, { color: colors.textPrimary }]}>
              {overallPercent}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${overallPercent}%` },
              ]}
            />
          </View>

          <Text style={[styles.dateRange, { color: colors.textMuted }]}>
            {fmtDay(program.start_date)}
            {program.planned_end_date ? ` – ${fmtFull(program.planned_end_date)}` : ''}
          </Text>

          <View style={[styles.statsDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t('training.weeksList.weeksDone')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {weeksDone}
                <Text style={[styles.statUnit, { color: colors.textMuted }]}> /{totalWeeks}</Text>
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t('training.weeksList.toGo')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {toGo}
                <Text style={[styles.statUnit, { color: colors.textMuted }]}>
                  {' '}
                  {t('training.weeksList.toGoUnit')}
                </Text>
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {t('training.weeksList.adherence')}
              </Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {adherence != null ? adherence : '—'}
                {adherence != null && (
                  <Text style={[styles.statUnit, { color: colors.textMuted }]}> %</Text>
                )}
              </Text>
            </View>
          </View>
        </Card>

        {/* ---- Browse weeks ---- */}
        {weeks.length > 0 && (
          <View style={styles.browseSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {t('training.weeksList.browseWeeks')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStrip}
            >
              {weeks.map((week) => (
                <WeekTile
                  key={week.id}
                  week={week}
                  isSelected={week.id === selectedWeekId}
                  onSelect={setSelectedWeekId}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ---- Selected week card ---- */}
        {selectedWeek && selectedStats && (
          <Card
            style={
              selectedIsCurrent
                ? [styles.weekCard, { borderColor: colors.primary, borderWidth: 1.5 }]
                : styles.weekCard
            }
          >
            <View style={styles.weekCardHeader}>
              <View style={styles.weekCardTitleRow}>
                <Text style={[styles.weekCardTitle, { color: colors.textPrimary }]}>
                  {t('training.weeksList.weekNumber', { number: selectedWeek.week_number })}
                </Text>
                {!!selectedWeek.phase_name && (
                  <View
                    style={[styles.phasePill, { backgroundColor: colors.cardBackgroundHighlight }]}
                  >
                    <Text style={[styles.phaseText, { color: colors.textSecondary }]}>
                      {selectedWeek.phase_name}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.weekCardHeaderRight}>
                {!!selectedWeek.coaching_hint && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('TrainingWeekDetail', { weekId: selectedWeek.id })
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="bulb" size={18} color={colors.warning} />
                  </TouchableOpacity>
                )}
                {selectedIsCurrent && (
                  <View style={[styles.currentPill, { backgroundColor: colors.primary }]}>
                    <View style={[styles.currentDot, { backgroundColor: colors.white }]} />
                    <Text style={[styles.currentPillText, { color: colors.white }]}>
                      {t('training.weeksList.current')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.weekMetaRow}>
              <View style={styles.weekMetaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.weekMetaText, { color: colors.textSecondary }]}>
                  {new Date(selectedWeek.start_date).getDate()}–{fmtDay(selectedWeek.end_date)}
                </Text>
              </View>
              {selectedStats.plannedMinutes > 0 && (
                <View style={styles.weekMetaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.weekMetaText, { color: colors.textSecondary }]}>
                    {t('training.weeksList.planned', {
                      value: formatDurationCompact(selectedStats.plannedMinutes * 60),
                    })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sessionsHeader}>
              <Text style={[styles.sessionsLabel, { color: colors.textSecondary }]}>
                {t('training.weeksList.sessions')}
              </Text>
              <Text style={[styles.sessionsCount, { color: colors.textPrimary }]}>
                {selectedStats.completed}/{selectedStats.total}
              </Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                styles.sessionsTrack,
                { backgroundColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${selectedStats.percent}%` },
                ]}
              />
            </View>

            {selectedStats.sessions.length > 0 && (
              <View style={styles.sessionsList}>
                {selectedStats.sessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.viewProgressBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => {
                triggerHaptic();
                navigation.navigate('WeekFeedback', { weekId: selectedWeek.id });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="stats-chart" size={16} color={colors.primary} />
              <Text style={[styles.viewProgressText, { color: colors.primary }]}>
                {t('training.weeksList.viewWeekProgress')}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ---- Grouped program options ---- */}
        <OptionList options={programOptions} grouped />
      </ScrollView>

      {/* Switch-plan sheet */}
      <TrainingPlansSheet
        visible={showPlansSheet}
        onClose={() => setShowPlansSheet(false)}
        programs={programs}
        activeProgramId={program.id}
        onSelectProgram={(p) => handleSelectProgram(p.id)}
        onCreateNew={handleCreateNewProgram}
      />

      <ProgramSettingsModal
        visible={showSettingsModal}
        program={program}
        sportTypes={sportTypes}
        onClose={() => setShowSettingsModal(false)}
        onSaved={reload}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  // Program overview card
  programCard: {
    padding: spacing.lg,
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  programName: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  goalText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  overallLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overallPercent: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dateRange: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  statsDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCol: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  statUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Browse weeks
  browseSection: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: msFont(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekStrip: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  // Selected week card
  weekCard: {
    padding: spacing.lg,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  weekCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  weekCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  phasePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  phaseText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  weekCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  currentPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  weekMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  weekMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekMetaText: {
    fontSize: fontSize.sm,
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sessionsLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sessionsCount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  sessionsTrack: {
    height: 6,
  },
  sessionsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  viewProgressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  viewProgressText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  proBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  proBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  // Settings modal
});
