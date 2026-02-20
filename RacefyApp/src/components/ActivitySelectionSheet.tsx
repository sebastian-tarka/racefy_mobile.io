import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivitySelectionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (activity: Activity) => void;
  activities: Activity[];
  isLoading?: boolean;
  currentWeekId?: number;
}

export function ActivitySelectionSheet({
  visible,
  onClose,
  onSelect,
  activities,
  isLoading = false,
  currentWeekId,
}: ActivitySelectionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort } = useUnits();
  const insets = useSafeAreaInsets();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatActivityDistance = (meters: number | null | undefined): string => {
    if (!meters) return '';
    return formatDistanceShort(meters);
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '';
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.cardBackground,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                  maxHeight: '70%',
                },
              ]}
            >
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              {/* Title */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('training.weekDetail.selectActivity')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t('training.weekDetail.selectActivitySubtitle')}
                </Text>
              </View>

              {/* Loading */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  {/* Empty State */}
                  {activities.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="fitness-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        {t('training.weekDetail.noActivities')}
                      </Text>
                      <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                        {t('training.weekDetail.noActivitiesHint')}
                      </Text>
                    </View>
                  )}

                  {/* Activity List */}
                  {activities.map((activity) => {
                    const isLinkedElsewhere = activity.training_week_id != null
                      && activity.training_week_id !== currentWeekId;

                    return (
                      <TouchableOpacity
                        key={activity.id}
                        style={[
                          styles.activityItem,
                          { backgroundColor: colors.background },
                        ]}
                        onPress={() => {
                          onSelect(activity);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.activityIcon,
                            { backgroundColor: colors.primary + '20' },
                          ]}
                        >
                          <Ionicons
                            name={(activity.sport_type?.icon as any) || 'fitness-outline'}
                            size={24}
                            color={colors.primary}
                          />
                        </View>
                        <View style={styles.activityInfo}>
                          <Text
                            style={[styles.activityTitle, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {activity.title}
                          </Text>
                          <Text style={[styles.activitySubtitle, { color: colors.textSecondary }]}>
                            {formatDate(activity.started_at)}
                          </Text>
                          <View style={styles.activityMeta}>
                            {activity.distance > 0 && (
                              <Text style={[styles.metricText, { color: colors.textMuted }]}>
                                {formatActivityDistance(activity.distance)}
                              </Text>
                            )}
                            {activity.distance > 0 && activity.duration > 0 && (
                              <Text style={[styles.metricSeparator, { color: colors.textMuted }]}>
                                ·
                              </Text>
                            )}
                            {activity.duration > 0 && (
                              <Text style={[styles.metricText, { color: colors.textMuted }]}>
                                {formatDuration(activity.duration)}
                              </Text>
                            )}
                          </View>
                          {isLinkedElsewhere && (
                            <View style={[styles.warningBadge, { backgroundColor: colors.warning + '15' }]}>
                              <Ionicons name="warning-outline" size={14} color={colors.warning} />
                              <Text style={[styles.warningText, { color: colors.warning }]}>
                                {t('training.weekDetail.alreadyLinked')}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  scrollView: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activitySubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  metricText: {
    fontSize: fontSize.xs,
  },
  metricSeparator: {
    fontSize: fontSize.xs,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cancelButton: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
});
