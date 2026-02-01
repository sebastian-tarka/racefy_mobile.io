import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useSportTypes } from '../../hooks/useSportTypes';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { ScreenHeader, Loading, Card, EmptyState } from '../../components';
import type { RootStackParamList } from '../../navigation/types';
import type { TrainingWeek, TrainingProgram, PausedReason, MentalBudget, AiMode } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  navigation: NavigationProp;
}

export function WeeksListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sportTypes } = useSportTypes();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [autoLinkActivities, setAutoLinkActivities] = useState(false);
  const [allowedSportTypes, setAllowedSportTypes] = useState<number[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Mental budget state
  const [mentalBudget, setMentalBudget] = useState<MentalBudget | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>('reactive');
  const [loadingMentalBudget, setLoadingMentalBudget] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [programData, weeksData] = await Promise.all([
        api.getCurrentProgram(),
        api.getWeeks(),
      ]);

      setProgram(programData);
      setWeeks(weeksData);

      logger.info('training', 'Loaded training program', {
        programId: programData?.id,
        totalWeeks: weeksData.length,
        currentWeekNumber: programData?.current_week_number,
      });
    } catch (err: any) {
      logger.error('training', 'Failed to load training weeks', { error: err });
      setError(err.message || t('training.errors.loadingFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

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

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const [actionLoading, setActionLoading] = useState(false);

  const handleWeekPress = (week: TrainingWeek) => {
    navigation.navigate('TrainingWeekDetail', {
      weekId: week.id,
    });
  };

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
              navigation.goBack();
            } catch (err: any) {
              logger.error('training', 'Failed to abandon program', { error: err });
              Alert.alert(t('training.errors.title'), err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePauseProgram = () => {
    if (!program) return;
    const reasons: PausedReason[] = ['injury', 'vacation', 'burnout', 'other'];
    Alert.alert(
      t('training.weeksList.pauseReasonTitle'),
      t('training.weeksList.confirmPauseMessage'),
      reasons.map((reason) => ({
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
      }))
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
      // Silently fail - mental budget is optional
    } finally {
      setLoadingMentalBudget(false);
    }
  };

  const handleOpenSettings = async () => {
    if (!program) return;
    // Refresh local state from program
    setAutoLinkActivities(program.auto_link_activities);
    setAllowedSportTypes(program.allowed_sport_types || []);
    setShowSettingsModal(true);
    // Load mental budget in parallel
    await loadMentalBudget();
  };

  const handleSaveSettings = async () => {
    if (!program) return;
    setSavingSettings(true);
    try {
      // Save program settings
      await api.updateProgramSettings(program.id, {
        auto_link_activities: autoLinkActivities,
        allowed_sport_types: allowedSportTypes.length > 0 ? allowedSportTypes : undefined,
      });
      logger.info('training', 'Program settings updated', {
        programId: program.id,
        autoLinkActivities,
        allowedSportTypes: allowedSportTypes.length,
      });

      // Save mental budget settings if changed
      if (mentalBudget && aiMode !== mentalBudget.ai_mode) {
        await api.updateMentalBudget({ ai_mode: aiMode });
        logger.info('training', 'Mental budget updated', { aiMode });
      }

      // Refresh program data
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
      await api.resumeProgram(program.id);
      logger.info('training', 'Program resumed', { programId: program.id });
      loadData(true);
    } catch (err: any) {
      logger.error('training', 'Failed to resume program', { error: err });
      Alert.alert(t('training.errors.title'), err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderWeekItem = ({ item: week }: { item: TrainingWeek }) => {
    const isCurrentWeek = week.status === 'current' || week.status === 'active';
    const activities = week.activities || [];

    // Use week.progress if activities are not loaded in list view
    const completedActivities = activities.length > 0
      ? activities.filter(a => a.status === 'completed').length
      : 0;
    const totalActivities = activities.length > 0
      ? activities.length
      : week.progress?.activities_count || 0;
    const completionPercentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;

    return (
      <TouchableOpacity
        onPress={() => handleWeekPress(week)}
        style={styles.weekCardContainer}
      >
        <Card style={[
          styles.weekCard,
          isCurrentWeek && { borderColor: colors.primary, borderWidth: 2 },
        ]}>
          <View style={styles.weekHeader}>
            <View style={styles.weekTitleContainer}>
              <Text style={[styles.weekTitle, { color: colors.textPrimary }]}>
                {t('training.weeksList.weekNumber', { number: week.week_number })}
              </Text>
              {isCurrentWeek && (
                <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.white }]}>
                    {t('training.weeksList.current')}
                  </Text>
                </View>
              )}
            </View>

            <View style={[
              styles.statusBadge,
              {
                backgroundColor:
                  week.status === 'completed'
                    ? colors.success + '15'
                    : week.status === 'skipped'
                      ? colors.textMuted + '15'
                      : isCurrentWeek
                        ? colors.primary + '15'
                        : colors.border,
              },
            ]}>
              <Text style={[
                styles.statusText,
                {
                  color:
                    week.status === 'completed'
                      ? colors.success
                      : week.status === 'skipped'
                        ? colors.textMuted
                        : isCurrentWeek
                          ? colors.primary
                          : colors.textSecondary,
                },
              ]}>
                {t(`training.weeksList.status.${isCurrentWeek ? 'current' : week.status}`)}
              </Text>
            </View>
          </View>

          <Text style={[styles.weekDate, { color: colors.textSecondary }]}>
            {new Date(week.start_date).toLocaleDateString()}
          </Text>

          {/* Progress Bar */}
          {totalActivities > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {t('training.weeksList.progress')}
                </Text>
                <Text style={[styles.progressValue, { color: colors.textPrimary }]}>
                  {completedActivities}/{totalActivities} {t('training.weekDetail.completed')}
                </Text>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor: colors.primary,
                      width: `${completionPercentage}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Activities Preview */}
          {(activities.length > 0 || totalActivities > 0) && (
            <View style={styles.sessionsPreview}>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <View
                    key={activity.id}
                    style={[
                      styles.sessionDot,
                      {
                        backgroundColor: activity.status === 'completed'
                          ? colors.success
                          : activity.status === 'skipped'
                            ? colors.textMuted
                            : colors.border,
                      },
                    ]}
                  />
                ))
              ) : (
                // Show placeholder dots when activities not loaded
                Array.from({ length: totalActivities }).map((_, idx) => (
                  <View
                    key={`dot-${idx}`}
                    style={[
                      styles.sessionDot,
                      { backgroundColor: colors.border },
                    ]}
                  />
                ))
              )}
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen message={t('common.loading')} />;
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('training.weeksList.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {program && (
        <View style={[styles.programInfo, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.programInfoRow}>
            <Ionicons name="calendar" size={20} color={colors.textSecondary} />
            <Text style={[styles.programInfoText, { color: colors.textSecondary }]}>
              {new Date(program.start_date).toLocaleDateString()}
              {program.planned_end_date && ` - ${new Date(program.planned_end_date).toLocaleDateString()}`}
            </Text>
          </View>
          <View style={styles.programInfoRow}>
            <Ionicons name="fitness" size={20} color={colors.primary} />
            <Text style={[styles.programInfoText, { color: colors.textPrimary }]}>
              {t('training.weeksList.programName')}: {program.name}
            </Text>
          </View>
          <View style={styles.programInfoRow}>
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text style={[styles.programInfoText, { color: colors.textPrimary }]}>
              {t('training.weeksList.weekProgress')}: {program.current_week_number || 0}/{program.total_weeks}
            </Text>
          </View>

          {/* Settings Button */}
          <TouchableOpacity
            style={[styles.settingsRow, { borderTopColor: colors.border }]}
            onPress={handleOpenSettings}
          >
            <View style={styles.settingsLabelRow}>
              <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>
                {t('training.weeksList.settings')}
              </Text>
            </View>
            <View style={styles.settingsValueRow}>
              <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                {program.auto_link_activities
                  ? t('training.weeksList.autoLinkEnabled')
                  : t('training.weeksList.autoLinkDisabled')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Program Actions */}
          <View style={styles.programActions}>
            {program.status === 'paused' ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleResumeProgram}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="play" size={16} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      {t('training.weeksList.resumeProgram')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning + '20', borderColor: colors.warning, borderWidth: 1 }]}
                onPress={handlePauseProgram}
                disabled={actionLoading}
              >
                <Ionicons name="pause" size={16} color={colors.warning} />
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>
                  {t('training.weeksList.pauseProgram')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '15', borderColor: colors.error, borderWidth: 1 }]}
              onPress={handleAbandonProgram}
              disabled={actionLoading}
            >
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>
                {t('training.weeksList.abandonProgram')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={weeks}
        renderItem={renderWeekItem}
        keyExtractor={(item) => `week-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={t('training.weeksList.empty.title')}
            message={t('training.weeksList.empty.message')}
          />
        }
      />

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('training.weeksList.settings')}
            </Text>
            <TouchableOpacity
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalDoneText, { color: colors.primary }]}>
                  {t('common.save')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
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
            {autoLinkActivities && program && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: colors.textPrimary }]}>
                  {t('training.calibration.crossTrainingSports')}
                </Text>
                <Text style={[styles.modalSectionDescription, { color: colors.textSecondary }]}>
                  {t('training.calibration.crossTrainingSportsDescription')}
                </Text>
                {sportTypes
                  .filter(s => s.id !== program.sport_type_id)
                  .map(sport => {
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
                          setAllowedSportTypes(prev =>
                            isSelected
                              ? prev.filter(id => id !== sport.id)
                              : [...prev, sport.id]
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
                  {/* AI Mode Options */}
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

                  {/* Usage Indicator */}
                  {mentalBudget && (
                    <View style={[styles.usageContainer, { backgroundColor: colors.cardBackground }]}>
                      <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
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
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  programInfo: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  programInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  programInfoText: {
    fontSize: fontSize.sm,
  },
  listContent: {
    padding: spacing.lg,
  },
  weekCardContainer: {
    marginBottom: spacing.lg,
  },
  weekCard: {
    padding: spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weekTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  weekDate: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: fontSize.sm,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  sessionsPreview: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sessionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  programActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
  },
  settingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  settingsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsValue: {
    fontSize: fontSize.sm,
  },
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
