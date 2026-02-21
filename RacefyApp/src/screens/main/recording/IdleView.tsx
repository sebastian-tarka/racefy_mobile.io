import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../../../theme';
import { formatTotalTime } from '../../../utils/formatters';
import type { Event, TrainingWeek, SuggestedActivity, ActivityStats, MilestoneSingle } from '../../../types/api';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';

// Milestone key-to-km mapping (shared with parent)
const MILESTONE_KM: Record<string, string> = {
  first_5km: '5',
  first_10km: '10',
  first_15km: '15',
  first_half_marathon: '21.1',
  first_30km: '30',
  first_marathon: '42.2',
};

interface IdleViewProps {
  selectedSport: SportTypeWithIcon | null;
  sportsLoading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  pulseAnim: Animated.Value;
  selectedEvent: Event | null;
  activeWeek: TrainingWeek | null;
  activityStats: ActivityStats | null;
  statsLoading: boolean;
  milestonesLoading: boolean;
  nextMilestone: MilestoneSingle | undefined;
  onStart: () => void;
  onOpenSportModal: () => void;
  onOpenEventSheet: () => void;
  onClearEvent: () => void;
  onRefreshEvents: () => void;
}

export function IdleView({
  selectedSport,
  sportsLoading,
  isLoading,
  isAuthenticated,
  pulseAnim,
  selectedEvent,
  activeWeek,
  activityStats,
  statsLoading,
  milestonesLoading,
  nextMilestone,
  onStart,
  onOpenSportModal,
  onOpenEventSheet,
  onClearEvent,
  onRefreshEvents,
}: IdleViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistanceShort, formatTotalDistance, getMilestoneLabel } = useUnits();

  const formatSuggestedDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    return minutes < 60 ? `${minutes}min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  };

  const renderSuggestedActivitiesSlider = () => {
    if (!activeWeek?.suggested_activities || activeWeek.suggested_activities.length === 0) {
      return null;
    }

    const suggestedActivities = activeWeek.suggested_activities;
    const progress = activeWeek.progress;
    const completedCount = progress?.activities_count ?? 0;
    const totalSessions = progress?.sessions_per_week ?? suggestedActivities.length;
    const isWeekComplete = completedCount >= totalSessions;

    return (
      <View style={styles.suggestedActivitiesSection}>
        <View style={styles.suggestedActivitiesHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.suggestedActivitiesTitle, { color: colors.textPrimary }]}>
            {t('recording.plannedThisWeek')}
          </Text>
          <View style={[styles.weekProgressBadge, { backgroundColor: isWeekComplete ? colors.success + '15' : colors.primary + '15' }]}>
            <Ionicons
              name={isWeekComplete ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={isWeekComplete ? colors.success : colors.primary}
            />
            <Text style={[styles.weekProgressText, { color: isWeekComplete ? colors.success : colors.primary }]}>
              {completedCount}/{totalSessions}
            </Text>
          </View>
        </View>

        <FlatList
          horizontal
          data={suggestedActivities}
          keyExtractor={(item) => `suggested-${item.id}`}
          renderItem={({ item, index }: { item: SuggestedActivity; index: number }) => {
            const isDone = index < completedCount;
            return (
              <View
                style={[
                  styles.suggestedActivityCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isDone ? colors.success + '40' : colors.border,
                  },
                ]}
              >
                <View style={[styles.suggestedActivityHeader, { backgroundColor: isDone ? colors.success + '15' : colors.primary + '15' }]}>
                  <View style={styles.activityHeaderRow}>
                    <Text style={[styles.suggestedActivityOrder, { color: isDone ? colors.success : colors.primary }]}>
                      {t('recording.session')} {item.session_order}
                    </Text>
                    {isDone && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    )}
                  </View>
                </View>

                <View style={styles.suggestedActivityBody}>
                  <Text style={[
                    styles.suggestedActivityType,
                    { color: isDone ? colors.textSecondary : colors.textPrimary },
                    isDone && styles.completedText,
                  ]}>
                    {item.activity_type}
                  </Text>

                  {item.intensity_description && (
                    <View style={[styles.suggestedActivityIntensity, { backgroundColor: colors.warning + '10' }]}>
                      <Ionicons name="pulse-outline" size={14} color={colors.warning} />
                      <Text style={[styles.suggestedActivityIntensityText, { color: colors.textSecondary }]}>
                        {item.intensity_description}
                      </Text>
                    </View>
                  )}

                  <View style={styles.suggestedActivityMetrics}>
                    {item.target_duration_minutes && (
                      <View style={styles.suggestedActivityMetric}>
                        <Ionicons name="time-outline" size={16} color={colors.success} />
                        <Text style={[styles.suggestedActivityMetricText, { color: colors.textPrimary }]}>
                          {formatSuggestedDuration(item.target_duration_minutes)}
                        </Text>
                      </View>
                    )}

                    {item.target_distance_meters && (
                      <View style={styles.suggestedActivityMetric}>
                        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                        <Text style={[styles.suggestedActivityMetricText, { color: colors.textPrimary }]}>
                          {formatDistanceShort(item.target_distance_meters)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedActivitiesList}
        />
      </View>
    );
  };

  return (
    <View style={styles.idleContainer}>
      {/* Sport Selector */}
      <View style={styles.idleSportSection}>
        <TouchableOpacity
          style={[styles.sportChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
          onPress={onOpenSportModal}
          disabled={isLoading || sportsLoading}
          activeOpacity={0.7}
        >
          {sportsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : selectedSport ? (
            <>
              <View style={[styles.sportChipIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name={selectedSport.icon} size={18} color={colors.white} />
              </View>
              <Text style={[styles.sportChipText, { color: colors.textPrimary }]}>
                {selectedSport.name}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </>
          ) : (
            <>
              <Ionicons name="bicycle-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.sportChipText, { color: colors.textSecondary }]}>
                {t('recording.selectSport')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Start Button - Hero */}
      <View style={styles.startSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={onStart}
            disabled={isLoading || !selectedSport}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="large" />
            ) : (
              <>
                <Ionicons name="play" size={48} color={colors.white} />
                <Text style={styles.startButtonText}>{t('recording.start')}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Event Link (Collapsed) */}
      {isAuthenticated && (
        <TouchableOpacity
          style={[styles.eventLinkRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          onPress={() => {
            onRefreshEvents();
            onOpenEventSheet();
          }}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <View style={styles.eventLinkLeft}>
            <Ionicons
              name={selectedEvent ? 'calendar' : 'calendar-outline'}
              size={20}
              color={selectedEvent ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.eventLinkText,
                { color: selectedEvent ? colors.textPrimary : colors.textSecondary }
              ]}
              numberOfLines={1}
            >
              {selectedEvent
                ? selectedEvent.post?.title || t('eventDetail.untitled')
                : t('recording.linkToEvent')}
            </Text>
          </View>
          <View style={styles.eventLinkRight}>
            {selectedEvent ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onClearEvent();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Suggested Activities from Training Plan */}
      {renderSuggestedActivitiesSlider()}

      {/* Quick Stats Preview */}
      {isAuthenticated && (
        <View style={[styles.quickStatsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {statsLoading || milestonesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.quickStatsLoading} />
          ) : (
            <>
              <View style={styles.quickStatsHeader}>
                <Text style={[styles.quickStatsTitle, { color: colors.textPrimary }]}>
                  {t('recording.yourStats', { sport: selectedSport?.name || '' })}
                </Text>
              </View>

              {activityStats && activityStats.count > 0 ? (
                <>
                  <View style={styles.quickStatsRow}>
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: colors.primary }]}>
                        {activityStats.count}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                        {t('recording.activities')}
                      </Text>
                    </View>
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: colors.primary }]}>
                        {formatTotalDistance(activityStats.totals.distance)}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                        {t('recording.totalDistance')}
                      </Text>
                    </View>
                    <View style={styles.quickStatItem}>
                      <Text style={[styles.quickStatValue, { color: colors.primary }]}>
                        {formatTotalTime(activityStats.totals.duration)}
                      </Text>
                      <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
                        {t('recording.totalTime')}
                      </Text>
                    </View>
                  </View>

                  {/* Next Milestone Preview */}
                  {nextMilestone && (
                    <View style={[styles.nextMilestonePreview, { borderTopColor: colors.border }]}>
                      <Ionicons name="flag-outline" size={16} color={colors.primary} />
                      <Text style={[styles.nextMilestoneText, { color: colors.textSecondary }]}>
                        {t('recording.nextMilestone')}: {getMilestoneLabel(MILESTONE_KM[nextMilestone.type] || nextMilestone.type)} ({Math.round(nextMilestone.progress * 100)}%)
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.noStatsPreview}>
                  <Ionicons name="rocket-outline" size={24} color={colors.textMuted} />
                  <Text style={[styles.noStatsPreviewText, { color: colors.textSecondary }]}>
                    {t('recording.noStats', { sport: selectedSport?.name?.toLowerCase() || '' })}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  idleContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  idleSportSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  sportChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportChipText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  startSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  startButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  eventLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  eventLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  eventLinkText: {
    fontSize: fontSize.md,
    flex: 1,
  },
  eventLinkRight: {
    marginLeft: spacing.sm,
  },
  quickStatsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  quickStatsLoading: {
    padding: spacing.lg,
  },
  quickStatsHeader: {
    marginBottom: spacing.md,
  },
  quickStatsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  nextMilestonePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  nextMilestoneText: {
    fontSize: fontSize.sm,
  },
  noStatsPreview: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  noStatsPreviewText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  suggestedActivitiesSection: {
    marginBottom: spacing.lg,
  },
  suggestedActivitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  suggestedActivitiesTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  weekProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  weekProgressText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  suggestedActivitiesList: {
    paddingRight: spacing.lg,
  },
  suggestedActivityCard: {
    width: 200,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  suggestedActivityHeader: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestedActivityOrder: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  suggestedActivityBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  suggestedActivityType: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  suggestedActivityIntensity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  suggestedActivityIntensityText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  suggestedActivityMetrics: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  suggestedActivityMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  suggestedActivityMetricText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
