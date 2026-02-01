import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import { ScreenHeader, Loading, Card, Button, ActivitySelectionSheet } from '../../components';
import type { RootStackParamList } from '../../navigation/types';
import type { TrainingWeek, TrainingActivity, SuggestedActivity, Activity } from '../../types/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'TrainingWeekDetail'>;

interface Props {
  navigation: NavigationProp;
  route: RoutePropType;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WeekDetailScreen({ navigation, route }: Props) {
  const { weekId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<TrainingWeek | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [activitySheetVisible, setActivitySheetVisible] = useState(false);
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const loadWeekData = useCallback(async () => {
    try {
      setLoading(true);
      const weekData = await api.getWeek(weekId);
      setWeek(weekData);
    } catch (err: any) {
      logger.error('training', 'Failed to load week detail', { error: err });
      Alert.alert(t('common.error'), err.message || t('training.errors.loadingFailed'));
    } finally {
      setLoading(false);
    }
  }, [weekId, t]);

  useEffect(() => {
    loadWeekData();
  }, [loadWeekData]);

  const handleCompleteWeek = async () => {
    Alert.alert(
      t('training.weekDetail.confirmComplete'),
      t('training.weekDetail.confirmCompleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setProcessingAction(true);
            try {
              await api.completeWeek(weekId);
              logger.info('training', 'Week completed', { weekId });
              Alert.alert(
                t('training.weekDetail.weekCompleted'),
                t('training.weekDetail.weekCompletedMessage'),
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
              );
            } catch (err: any) {
              logger.error('training', 'Failed to complete week', { error: err });
              Alert.alert(t('common.error'), err.message || t('training.errors.completeFailed'));
            } finally {
              setProcessingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleSkipWeek = async () => {
    Alert.alert(
      t('training.weekDetail.confirmSkip'),
      t('training.weekDetail.confirmSkipMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(true);
            try {
              await api.skipWeek(weekId);
              logger.info('training', 'Week skipped', { weekId });
              navigation.goBack();
            } catch (err: any) {
              logger.error('training', 'Failed to skip week', { error: err });
              Alert.alert(t('common.error'), err.message || t('training.errors.skipFailed'));
            } finally {
              setProcessingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleUnlinkActivity = (trainingActivityId: number) => {
    Alert.alert(
      t('training.weekDetail.confirmUnlink'),
      t('training.weekDetail.confirmUnlinkMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(true);
            try {
              const updatedWeek = await api.unlinkActivityFromWeek(weekId, trainingActivityId);
              setWeek(updatedWeek);
              logger.info('training', 'Activity unlinked', { weekId, trainingActivityId });
              Alert.alert(t('common.success'), t('training.weekDetail.activityUnlinked'));
            } catch (err: any) {
              logger.error('training', 'Failed to unlink activity', { error: err });
              Alert.alert(t('common.error'), err.message || t('training.errors.unlinkFailed'));
            } finally {
              setProcessingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleLinkActivity = async () => {
    setActivitiesLoading(true);
    setActivitySheetVisible(true);
    try {
      const program = await api.getCurrentProgram();
      const allowedTypes: number[] = program?.allowed_sport_types?.length
        ? program.allowed_sport_types
        : program?.sport_type_id
          ? [program.sport_type_id]
          : [];

      const response = await api.getActivities(user?.id ? { user_id: user.id } : undefined);
      const allActivities = response.data || [];

      const filtered = allActivities.filter(a => {
        const sportTypeId = a.sport_type_id ?? a.sport_type?.id;
        return (
          a.status === 'completed' &&
          (allowedTypes.length === 0 || (sportTypeId != null && allowedTypes.includes(sportTypeId)))
        );
      });

      setUserActivities(filtered);
    } catch (err: any) {
      logger.error('training', 'Failed to load activities for linking', { error: err });
      Alert.alert(t('common.error'), err.message || t('training.errors.loadingFailed'));
      setActivitySheetVisible(false);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleSelectActivity = (activity: Activity) => {
    const linkActivity = async () => {
      setProcessingAction(true);
      try {
        const updatedWeek = await api.linkActivityToWeek(weekId, activity.id);
        setWeek(updatedWeek);
        logger.info('training', 'Activity linked to week', { weekId, activityId: activity.id });
        Alert.alert(t('common.success'), t('training.weekDetail.activityLinked'));
      } catch (err: any) {
        logger.error('training', 'Failed to link activity', { error: err });
        Alert.alert(t('common.error'), err.message || t('training.errors.linkFailed'));
      } finally {
        setProcessingAction(false);
      }
    };

    if (activity.training_week_id != null && activity.training_week_id !== weekId) {
      Alert.alert(
        t('training.weekDetail.confirmReassign'),
        t('training.weekDetail.confirmReassignMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: linkActivity },
        ]
      );
    } else {
      linkActivity();
    }
  };

  const formatDistance = (meters: number | null): string => {
    if (!meters) return '';
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (loading) {
    return <Loading fullScreen message={t('common.loading')} />;
  }

  if (!week) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('training.weekDetail.title', { number: '...' })}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('training.errors.weekNotFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activities = week.activities || [];
  const suggestedActivities = week.suggested_activities || [];
  const completedActivities = activities.filter(a => a.status === 'completed').length;
  const totalActivities = week.progress.sessions_per_week;
  const completionPercentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
  const isCompleted = week.status === 'completed';
  const isSkipped = week.status === 'skipped';

  // Use suggested activities if available, otherwise fall back to old activities
  const useSuggestedActivities = suggestedActivities.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('training.weekDetail.title', { number: week.week_number })}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week Info Card */}
        <Card style={styles.weekInfoCard}>
          <Text style={[styles.weekInfoPhase, { color: colors.primary }]}>
            {week.phase_name}
          </Text>
          <Text style={[styles.weekInfoDate, { color: colors.textSecondary }]}>
            {new Date(week.start_date).toLocaleDateString()} - {new Date(week.end_date).toLocaleDateString()}
          </Text>

          {week.focus_description && (
            <Text style={[styles.weekFocus, { color: colors.textPrimary }]}>
              {week.focus_description}
            </Text>
          )}

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {t('training.weekDetail.progress')}
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
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {Math.round(completionPercentage)}%
            </Text>
          </View>
        </Card>

        {/* Activities List */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {useSuggestedActivities
            ? t('training.weekDetail.plannedSessions')
            : t('training.weekDetail.activities')}
        </Text>

        {/* Suggested Activities (New Format) */}
        {useSuggestedActivities && suggestedActivities.map((activity) => (
          <Card key={activity.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionTitleContainer}>
                <View style={[
                  styles.sessionNumberBadge,
                  { backgroundColor: colors.primary + '15' },
                ]}>
                  <Text style={[styles.sessionNumberText, { color: colors.primary }]}>
                    {t('training.weekDetail.sessionNumber', { number: activity.session_order })}
                  </Text>
                </View>
              </View>

              <Text style={[styles.sessionType, { color: colors.textPrimary }]}>
                {activity.activity_type}
              </Text>
            </View>

            {/* Intensity Badge */}
            {activity.intensity_description && (
              <View style={[styles.intensityBadge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="pulse-outline" size={18} color={colors.primary} />
                <Text style={[styles.intensityText, { color: colors.textPrimary }]}>
                  {activity.intensity_description}
                </Text>
              </View>
            )}

            {/* Target Metrics */}
            <View style={styles.sessionDetails}>
              {activity.target_duration_minutes && (
                <View style={[styles.targetMetric, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                  <Ionicons name="time" size={20} color={colors.success} />
                  <View style={styles.targetMetricContent}>
                    <Text style={[styles.targetMetricLabel, { color: colors.textSecondary }]}>
                      {t('training.weekDetail.targetDuration')}
                    </Text>
                    <Text style={[styles.targetMetricValue, { color: colors.textPrimary }]}>
                      {formatDuration(activity.target_duration_minutes)}
                    </Text>
                  </View>
                </View>
              )}

              {activity.target_distance_meters && (
                <View style={[styles.targetMetric, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                  <Ionicons name="trending-up" size={20} color={colors.primary} />
                  <View style={styles.targetMetricContent}>
                    <Text style={[styles.targetMetricLabel, { color: colors.textSecondary }]}>
                      {t('training.weekDetail.targetDistance')}
                    </Text>
                    <Text style={[styles.targetMetricValue, { color: colors.textPrimary }]}>
                      {formatDistance(activity.target_distance_meters)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Activity Notes */}
            {activity.notes && (
              <View style={[styles.notesContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {activity.notes}
                </Text>
              </View>
            )}
          </Card>
        ))}

        {/* Legacy Activities (Old Format) */}
        {!useSuggestedActivities && activities.map((activity) => (
          <Card key={activity.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionTitleContainer}>
                <View style={[
                  styles.dayBadge,
                  {
                    backgroundColor: activity.status === 'completed'
                      ? colors.success + '15'
                      : activity.status === 'skipped'
                        ? colors.textMuted + '15'
                        : colors.primary + '15',
                  },
                ]}>
                  <Text style={[
                    styles.dayBadgeText,
                    {
                      color: activity.status === 'completed'
                        ? colors.success
                        : activity.status === 'skipped'
                          ? colors.textMuted
                          : colors.primary,
                    },
                  ]}>
                    {DAY_NAMES[activity.day_of_week - 1]}
                  </Text>
                </View>
                {activity.status === 'completed' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
                {activity.status === 'skipped' && (
                  <Ionicons name="remove-circle" size={24} color={colors.textMuted} />
                )}
              </View>

              <Text style={[styles.sessionType, { color: colors.textPrimary }]}>
                {activity.activity_type}
              </Text>
            </View>

            <View style={styles.sessionDetails}>
              {activity.duration_minutes && (
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.sessionDetailText, { color: colors.textSecondary }]}>
                    {formatDuration(activity.duration_minutes)}
                  </Text>
                </View>
              )}

              {activity.distance_meters && (
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.sessionDetailText, { color: colors.textSecondary }]}>
                    {formatDistance(activity.distance_meters)}
                  </Text>
                </View>
              )}

              {activity.pace_target && (
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.sessionDetailText, { color: colors.textSecondary }]}>
                    {activity.pace_target} /km
                  </Text>
                </View>
              )}

              {activity.intensity && (
                <View style={styles.sessionDetailRow}>
                  <Ionicons name="fitness-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.sessionDetailText, { color: colors.textSecondary }]}>
                    {activity.intensity}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.sessionDescription, { color: colors.textSecondary }]}>
              {activity.description}
            </Text>

            {activity.notes && (
              <View style={[styles.notesContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {activity.notes}
                </Text>
              </View>
            )}

            {activity.status === 'completed' && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.completedText, { color: colors.success }]}>
                  {t('training.weekDetail.activityCompleted')}
                </Text>
              </View>
            )}

            {activity.status === 'skipped' && (
              <View style={[styles.completedBadge, { backgroundColor: colors.textMuted + '15' }]}>
                <Ionicons name="remove-circle" size={20} color={colors.textMuted} />
                <Text style={[styles.completedText, { color: colors.textMuted }]}>
                  {t('training.weekDetail.activitySkipped')}
                </Text>
              </View>
            )}

            {/* Linked Activity Badge */}
            {activity.linked_activity_id && (
              <View style={[styles.linkedBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
                <View style={styles.linkedBadgeContent}>
                  <Ionicons name="link" size={18} color={colors.success} />
                  <Text style={[styles.linkedBadgeText, { color: colors.success }]}>
                    {t('training.weekDetail.linkedActivity')}
                  </Text>
                </View>
                {!isCompleted && !isSkipped && (
                  <TouchableOpacity
                    onPress={() => handleUnlinkActivity(activity.id)}
                    disabled={processingAction}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.success} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        ))}

        {/* Link Existing Activity Button */}
        {week.status === 'current' && (
          <TouchableOpacity
            style={[styles.linkActivityButton, { borderColor: colors.border }]}
            onPress={handleLinkActivity}
            disabled={processingAction}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.linkActivityText, { color: colors.primary }]}>
              {t('training.weekDetail.linkExistingActivity')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Week Actions */}
        {!isCompleted && !isSkipped && week.status === 'current' && (
          <View style={styles.actionsContainer}>
            <Button
              title={t('training.weekDetail.completeWeek')}
              onPress={handleCompleteWeek}
              loading={processingAction}
              disabled={processingAction}
              variant="primary"
              fullWidth
            />
            <Button
              title={t('training.weekDetail.skipWeek')}
              onPress={handleSkipWeek}
              loading={processingAction}
              disabled={processingAction}
              variant="outline"
              fullWidth
            />
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <ActivitySelectionSheet
        visible={activitySheetVisible}
        onClose={() => setActivitySheetVisible(false)}
        onSelect={handleSelectActivity}
        activities={userActivities}
        isLoading={activitiesLoading}
        currentWeekId={weekId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  weekInfoCard: {
    marginBottom: spacing.lg,
  },
  weekInfoPhase: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  weekInfoDate: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  weekFocus: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  progressSection: {
    gap: spacing.sm,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: fontSize.sm,
  },
  progressValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.md,
  },
  progressPercentage: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sessionCard: {
    marginBottom: spacing.lg,
  },
  sessionHeader: {
    marginBottom: spacing.md,
  },
  sessionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dayBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sessionType: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  sessionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sessionDetailText: {
    fontSize: fontSize.sm,
  },
  sessionDescription: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  notesText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  completedText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  linkedBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkedBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  linkActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  linkActivityText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  sessionNumberBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sessionNumberText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  intensityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  intensityText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  targetMetric: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  targetMetricContent: {
    flex: 1,
  },
  targetMetricLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs / 2,
    textTransform: 'uppercase',
  },
  targetMetricValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
