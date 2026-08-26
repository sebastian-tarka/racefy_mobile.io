import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import type { RootStackParamList } from '../../navigation/types';
import type {
  AiMode,
  MentalBudget,
  PausedReason,
  PlanWarning,
  TrainingProgram,
  TrainingWeek,
} from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'TrainingWeeksList'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fmtFull = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmtKm = (meters: number) => `${Math.round(meters / 100) / 10} km`;

interface UISession {
  id: string;
  title: string;
  detail: string;
  durationMinutes: number;
  status: 'completed' | 'skipped' | 'pending';
  iconType: string;
  /** Per-session discipline; only set on multi-sport (triathlon) plans. */
  sportSlug?: string | null;
}

/**
 * Normalize a week's sessions into a single list. Prefers `activities` (they carry a
 * completion status → DONE/PLANNED); falls back to the prescribed `suggested_activities`
 * (always shown as planned) when no concrete activities exist yet.
 */
function getSessions(week: TrainingWeek): UISession[] {
  const acts = week.activities || [];
  if (acts.length > 0) {
    return acts.map((a) => ({
      id: `a-${a.id}`,
      title: humanize(a.description || a.activity_type),
      detail: [a.distance_meters ? fmtKm(a.distance_meters) : null, a.intensity]
        .filter(Boolean)
        .join(' · '),
      durationMinutes: a.duration_minutes || 0,
      status: a.status,
      iconType: a.activity_type,
    }));
  }
  const suggested = week.suggested_activities || [];
  return suggested.map((s) => ({
    id: `s-${s.id}`,
    title: humanize(s.activity_type),
    detail: [
      s.target_distance_meters ? fmtKm(s.target_distance_meters) : null,
      s.intensity_description,
    ]
      .filter(Boolean)
      .join(' · '),
    durationMinutes: s.target_duration_minutes || 0,
    status: 'pending' as const,
    iconType: s.activity_type,
    sportSlug: s.sport_slug,
  }));
}

/** Completed / total sessions, planned minutes and percent for a week. */
function weekStats(week: TrainingWeek) {
  const sessions = getSessions(week);
  const statusCompleted = sessions.filter((s) => s.status === 'completed').length;
  // The backend exposes completed/planned counts in `progress` (derived from
  // activity matching). Prefer them so the card matches the week-progress
  // (compliance) screen even when per-session status isn't set on auto-linked runs.
  const completed = Math.max(statusCompleted, week.progress?.activities_count ?? 0);
  const total =
    week.progress?.suggested_activities_count ||
    week.progress?.sessions_per_week ||
    sessions.length;
  const plannedMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return { sessions, completed, total, plannedMinutes, percent };
}

/**
 * `sportSlug` is the session's own discipline and is authoritative when present
 * — in a triathlon plan one week mixes swims, rides and runs, which the
 * name-sniffing fallback below cannot reliably tell apart.
 */
function activityIcon(type: string, sportSlug?: string | null): keyof typeof Ionicons.glyphMap {
  const slug = (sportSlug || '').toLowerCase();
  if (slug.includes('swim')) return 'water';
  if (slug.includes('cycl') || slug.includes('bike')) return 'bicycle';
  if (slug.includes('run') || slug.includes('walk')) return 'walk';

  const t = (type || '').toLowerCase();
  if (t.includes('rest')) return 'bed-outline';
  if (t.includes('hill') || t.includes('interval') || t.includes('tempo') || t.includes('speed'))
    return 'flame';
  if (t.includes('bike') || t.includes('cycl') || t.includes('cross')) return 'bicycle';
  if (t.includes('swim')) return 'water';
  return 'walk';
}

function humanize(text: string): string {
  if (!text) return '';
  const s = text.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function WeeksListScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [autoLinkActivities, setAutoLinkActivities] = useState(false);
  const [allowedSportTypes, setAllowedSportTypes] = useState<number[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Mental budget state
  const [mentalBudget, setMentalBudget] = useState<MentalBudget | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>('reactive');
  const [loadingMentalBudget, setLoadingMentalBudget] = useState(false);

  // Coaching hints state
  const [generatingHints, setGeneratingHints] = useState(false);
  const [hintsProgress, setHintsProgress] = useState({ done: 0, total: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      } catch (err: any) {
        logger.error('training', 'Failed to load training weeks', { error: err });
        setError(err.message || t('training.errors.loadingFailed'));
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

  // Initialize settings when program loads
  useEffect(() => {
    if (program) {
      setAutoLinkActivities(program.auto_link_activities);
      setAllowedSportTypes(program.allowed_sport_types || []);
    }
  }, [program]);

  // Keep the selected week valid; default to the current week.
  useEffect(() => {
    if (weeks.length === 0) {
      setSelectedWeekId(null);
      return;
    }
    if (!weeks.some((w) => w.id === selectedWeekId)) {
      const current = weeks.find((w) => w.status === 'current' || w.status === 'active');
      setSelectedWeekId((current ?? weeks[0]).id);
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
            } catch (err: any) {
              logger.error('training', 'Failed to abandon program', { error: err });
              Alert.alert(t('training.errors.title'), err.message);
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
            } catch (err: any) {
              logger.error('training', 'Failed to pause program', { error: err });
              Alert.alert(t('training.errors.title'), err.message);
            } finally {
              setActionLoading(false);
            }
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const loadMentalBudget = async () => {
    if (!program) return;
    setLoadingMentalBudget(true);
    try {
      const budget = await api.getMentalBudget();
      setMentalBudget(budget);
      setAiMode(budget.ai_mode);
      logger.info('training', 'Mental budget loaded', { budget });
    } catch (err: any) {
      logger.error('training', 'Failed to load mental budget', { error: err });
    } finally {
      setLoadingMentalBudget(false);
    }
  };

  const handleOpenSettings = async () => {
    if (!program) return;
    setAutoLinkActivities(program.auto_link_activities);
    setAllowedSportTypes(program.allowed_sport_types || []);
    setShowSettingsModal(true);
    await loadMentalBudget();
  };

  const handleSaveSettings = async () => {
    if (!program) return;
    setSavingSettings(true);
    try {
      await api.updateProgramSettings(program.id, {
        auto_link_activities: autoLinkActivities,
        // null (not undefined, not []) is how "every sport counts" is expressed.
        // Sending undefined omits the field, which left the user unable to clear
        // a restriction once set; [] persists something that reads as a
        // restriction but enforces nothing.
        allowed_sport_types: allowedSportTypes.length > 0 ? allowedSportTypes : null,
      });
      logger.info('training', 'Program settings updated', {
        programId: program.id,
        autoLinkActivities,
        allowedSportTypes: allowedSportTypes.length,
      });

      if (mentalBudget && aiMode !== mentalBudget.ai_mode) {
        await api.updateMentalBudget({ ai_mode: aiMode });
        logger.info('training', 'Mental budget updated', { aiMode });
      }

      await loadData(true);
      setShowSettingsModal(false);
      Alert.alert(t('common.success'), t('training.weeksList.settingsUpdated'));
    } catch (err: any) {
      logger.error('training', 'Failed to update settings', { error: err });
      Alert.alert(t('common.error'), err.message);
    } finally {
      setSavingSettings(false);
    }
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
    } catch (err: any) {
      logger.error('training', 'Failed to resume program', { error: err });
      Alert.alert(t('training.errors.title'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleGenerateHints = async () => {
    if (!program) return;

    if (weeks.every((w) => w.coaching_hint)) {
      Alert.alert(
        t('training.coachingHints.sectionTitle'),
        t('training.coachingHints.allGenerated'),
      );
      return;
    }

    setGeneratingHints(true);
    try {
      const response = await api.generateAllHints(program.id);

      if (response.status === 'completed') {
        await loadData(true);
        setGeneratingHints(false);
        triggerHaptic();
        Alert.alert(
          t('training.coachingHints.sectionTitle'),
          t('training.coachingHints.generationComplete'),
        );
        return;
      }

      const totalWeeks = response.total_weeks || program.total_weeks;
      const weeksPending = response.weeks_pending || 0;
      setHintsProgress({ done: totalWeeks - weeksPending, total: totalWeeks });

      pollRef.current = setInterval(async () => {
        try {
          const updatedWeeks = await api.getWeeks();
          setWeeks(updatedWeeks);

          const remaining = updatedWeeks.filter((w) => !w.coaching_hint).length;
          setHintsProgress({ done: totalWeeks - remaining, total: totalWeeks });

          if (remaining === 0) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setGeneratingHints(false);
            triggerHaptic();
            Alert.alert(
              t('training.coachingHints.sectionTitle'),
              t('training.coachingHints.generationComplete'),
            );
          }
        } catch (pollErr) {
          logger.error('training', 'Polling hints progress failed', { error: pollErr });
        }
      }, 5000);
    } catch (err: any) {
      setGeneratingHints(false);
      logger.error('training', 'Failed to generate coaching hints', { error: err });
      if (err?.status === 403 && err?.data?.required_tier) {
        upgradePromptEmitter.emit('show', { feature: 'coaching_hints_bulk', currentTier: tier });
        return;
      }
      Alert.alert(t('common.error'), t('training.coachingHints.generationFailed'));
    }
  };

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
  const totalWeeks = program.total_weeks || 0;
  const currentWeekNumber = program.current_week_number ?? 0;
  const weeksDone = Math.max(0, currentWeekNumber - 1);
  const toGo = Math.max(0, totalWeeks - weeksDone);
  const overallPercent =
    totalWeeks > 0 ? Math.min(100, Math.round((weeksDone / totalWeeks) * 100)) : 0;

  // Adherence: completed vs planned sessions across all non-upcoming weeks (computed client-side).
  const adherence = (() => {
    let done = 0;
    let planned = 0;
    weeks.forEach((w) => {
      if (w.status === 'upcoming') return;
      const s = weekStats(w);
      done += s.completed;
      planned += s.total;
    });
    return planned > 0 ? Math.round((done / planned) * 100) : null;
  })();

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

  const renderWeekTile = (week: TrainingWeek) => {
    const isCurrent = week.status === 'current' || week.status === 'active';
    const isSelected = week.id === selectedWeekId;
    const dotColor =
      week.status === 'completed'
        ? colors.success
        : week.status === 'skipped'
          ? colors.textMuted
          : isCurrent
            ? colors.white
            : 'transparent';

    return (
      <TouchableOpacity
        key={week.id}
        style={[
          styles.weekTile,
          {
            backgroundColor: isCurrent ? colors.textPrimary : colors.cardBackground,
            borderColor: isSelected ? colors.primary : colors.borderLight,
          },
        ]}
        onPress={() => setSelectedWeekId(week.id)}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.weekTileLabel,
            { color: isCurrent ? colors.background : colors.textMuted },
          ]}
        >
          {t('training.weeksList.weekShort')}
        </Text>
        <Text
          style={[
            styles.weekTileNumber,
            { color: isCurrent ? colors.background : colors.textPrimary },
          ]}
        >
          {week.week_number}
        </Text>
        <View
          style={[
            styles.weekTileDot,
            dotColor === 'transparent'
              ? { borderWidth: 1.5, borderColor: colors.border }
              : { backgroundColor: dotColor },
          ]}
        />
      </TouchableOpacity>
    );
  };

  const renderSession = (session: UISession) => {
    const done = session.status === 'completed';
    const skipped = session.status === 'skipped';
    const duration = session.durationMinutes
      ? formatDurationCompact(session.durationMinutes * 60)
      : null;
    const statusColor = done ? colors.success : skipped ? colors.textMuted : colors.textSecondary;
    const statusLabel = done
      ? t('training.weeksList.sessionStatus.done')
      : skipped
        ? t('training.weeksList.sessionStatus.skipped')
        : t('training.weeksList.sessionStatus.planned');

    return (
      <View key={session.id} style={styles.session}>
        <View
          style={[
            styles.sessionIcon,
            { backgroundColor: done ? colors.success : colors.primary + '18' },
          ]}
        >
          <Ionicons
            name={done ? 'checkmark' : activityIcon(session.iconType, session.sportSlug)}
            size={18}
            color={done ? colors.white : colors.primary}
          />
        </View>
        <View style={styles.sessionText}>
          <Text style={[styles.sessionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {session.title}
          </Text>
          {!!session.detail && (
            <Text style={[styles.sessionDetail, { color: colors.textSecondary }]} numberOfLines={1}>
              {session.detail}
            </Text>
          )}
        </View>
        <View style={styles.sessionMeta}>
          {duration && (
            <Text
              style={[
                styles.sessionDuration,
                { color: done ? colors.textMuted : colors.textPrimary },
                done && styles.strikethrough,
              ]}
            >
              {duration}
            </Text>
          )}
          <Text style={[styles.sessionStatus, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  const selectedStats = selectedWeek ? weekStats(selectedWeek) : null;
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
              {weeks.map(renderWeekTile)}
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
              <View style={styles.sessionsList}>{selectedStats.sessions.map(renderSession)}</View>
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

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <ScreenContainer style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('training.weeksList.settings')}
            </Text>
            <TouchableOpacity onPress={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalDoneText, { color: colors.primary }]}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Auto-Link Toggle */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                {t('training.weeksList.autoLinkTitle')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.modalToggleRow,
                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  autoLinkActivities && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={() => setAutoLinkActivities(!autoLinkActivities)}
              >
                <View style={styles.modalToggleLabel}>
                  <Ionicons
                    name={autoLinkActivities ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={autoLinkActivities ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.modalToggleContent}>
                    <Text style={[styles.modalToggleText, { color: colors.textPrimary }]}>
                      {t('training.calibration.autoLinkActivities')}
                    </Text>
                    <Text style={[styles.modalToggleDescription, { color: colors.textSecondary }]}>
                      {t('training.calibration.autoLinkActivitiesDescription')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Cross-Training Sports */}
            {autoLinkActivities && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  {t('training.calibration.crossTrainingSports')}
                </Text>
                <Text style={[styles.modalSectionDescription, { color: colors.textSecondary }]}>
                  {t('training.calibration.crossTrainingSportsDescription')}
                </Text>
                {sportTypes
                  .filter((s) => s.id !== program.sport_type_id)
                  .map((sport) => {
                    const isSelected = allowedSportTypes.includes(sport.id);
                    return (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          styles.modalSportRow,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          isSelected && {
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '15',
                          },
                        ]}
                        onPress={() => {
                          setAllowedSportTypes((prev) =>
                            isSelected ? prev.filter((id) => id !== sport.id) : [...prev, sport.id],
                          );
                        }}
                      >
                        <Ionicons
                          name={sport.icon || 'fitness-outline'}
                          size={24}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.modalSportText, { color: colors.textPrimary }]}>
                          {sport.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}

            {/* Mental Budget / Training Tips Settings */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                {t('training.tips.settings.title')}
              </Text>
              <Text style={[styles.modalSectionDescription, { color: colors.textSecondary }]}>
                {t('training.tips.settings.frequency')}
              </Text>

              {loadingMentalBudget ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <>
                  {(['silent', 'reactive', 'proactive'] as AiMode[]).map((mode) => {
                    const isSelected = aiMode === mode;
                    const modeIcons: Record<AiMode, string> = {
                      silent: 'volume-mute',
                      reactive: 'volume-medium',
                      proactive: 'volume-high',
                    };
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modalSportRow,
                          { backgroundColor: colors.cardBackground, borderColor: colors.border },
                          isSelected && {
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + '15',
                          },
                        ]}
                        onPress={() => setAiMode(mode)}
                      >
                        <Ionicons
                          name={modeIcons[mode] as any}
                          size={24}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.modalSportText, { color: colors.textPrimary }]}>
                          {t(`training.tips.settings.${mode}`)}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {mentalBudget && (
                    <View
                      style={[styles.usageContainer, { backgroundColor: colors.cardBackground }]}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={20}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.usageText, { color: colors.textSecondary }]}>
                        {t('training.tips.settings.usage', {
                          delivered: mentalBudget.tips_delivered_this_week,
                          max: mentalBudget.max_tips_per_week,
                        })}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </ScreenContainer>
      </Modal>
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
  weekTile: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  weekTileLabel: {
    fontSize: msFont(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekTileNumber: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  weekTileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
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
  session: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sessionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  sessionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sessionDetail: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  sessionMeta: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  sessionStatus: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalDoneText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.xxl,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalSectionDescription: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  modalToggleLabel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  modalToggleContent: {
    flex: 1,
  },
  modalToggleText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  modalToggleDescription: {
    fontSize: fontSize.sm,
  },
  modalSportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  modalSportText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  usageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  usageText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
});
