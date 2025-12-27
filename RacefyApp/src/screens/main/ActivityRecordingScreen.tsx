import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card, Button, Badge } from '../../components';
import { useLiveActivity, usePermissions } from '../../hooks';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

// Mock data for milestones based on previous activities
const mockMilestones = [
  { distance: 1000, label: '1 km', bestTime: 298, avgTime: 325 },
  { distance: 2000, label: '2 km', bestTime: 612, avgTime: 658 },
  { distance: 3000, label: '3 km', bestTime: 935, avgTime: 1005 },
  { distance: 5000, label: '5 km', bestTime: 1580, avgTime: 1720 },
  { distance: 10000, label: '10 km', bestTime: 3250, avgTime: 3540 },
];

const sportTypes = [
  { id: 1, name: 'Running', icon: 'walk-outline' as const },
  { id: 2, name: 'Cycling', icon: 'bicycle-outline' as const },
  { id: 3, name: 'Swimming', icon: 'water-outline' as const },
  { id: 4, name: 'Gym', icon: 'barbell-outline' as const },
];

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

export function ActivityRecordingScreen() {
  const { t } = useTranslation();
  const { requestActivityTrackingPermissions } = usePermissions();
  const {
    activity,
    isTracking,
    isPaused,
    isLoading,
    error,
    currentStats,
    hasExistingActivity,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    discardTracking,
    clearError,
  } = useLiveActivity();

  const [selectedSport, setSelectedSport] = useState(sportTypes[0]);
  const [localDuration, setLocalDuration] = useState(0);
  const [passedMilestones, setPassedMilestones] = useState<number[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  // Derive status from live activity state
  const getStatus = (): RecordingStatus => {
    if (!activity) return 'idle';
    if (activity.status === 'completed') return 'finished';
    if (isPaused) return 'paused';
    if (isTracking) return 'recording';
    return 'idle';
  };

  const status = getStatus();
  const distance = currentStats.distance;

  // Sync local timer with activity state
  useEffect(() => {
    if (activity && isTracking && !isPaused) {
      // Start local timer
      const activityStart = new Date(activity.started_at).getTime();
      const pausedMs = (activity.total_paused_duration || 0) * 1000;
      startTimeRef.current = activityStart + pausedMs;

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setLocalDuration(Math.max(0, elapsed));
      }, 100);
    } else if (isPaused && activity) {
      // When paused, use the activity's duration
      setLocalDuration(activity.duration);
      pausedDurationRef.current = activity.duration;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (!activity) {
      // Reset when no activity
      setLocalDuration(0);
      pausedDurationRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activity, isTracking, isPaused]);

  // Check milestones
  useEffect(() => {
    mockMilestones.forEach((milestone) => {
      if (
        distance >= milestone.distance &&
        !passedMilestones.includes(milestone.distance)
      ) {
        setPassedMilestones((prev) => [...prev, milestone.distance]);
        Vibration.vibrate(200);
      }
    });
  }, [distance, passedMilestones]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error, [{ text: t('common.ok'), onPress: clearError }]);
    }
  }, [error, clearError, t]);

  // Show dialog when there's an existing unfinished activity
  useEffect(() => {
    if (hasExistingActivity && activity) {
      const isInProgress = activity.status === 'in_progress';
      const messageKey = isInProgress
        ? 'recording.existingActivity.messageInProgress'
        : 'recording.existingActivity.message';
      const resumeButtonKey = isInProgress
        ? 'recording.existingActivity.continue'
        : 'recording.existingActivity.resume';

      Alert.alert(
        t('recording.existingActivity.title'),
        t(messageKey, {
          duration: formatTime(activity.duration),
          distance: formatDistance(activity.distance),
        }),
        [
          {
            text: t(resumeButtonKey),
            onPress: async () => {
              try {
                await requestActivityTrackingPermissions();
                await resumeTracking();
              } catch (err) {
                console.error('Failed to resume:', err);
              }
            },
          },
          {
            text: t('recording.existingActivity.finish'),
            onPress: async () => {
              try {
                await finishTracking();
                Alert.alert(t('common.success'), t('recording.activitySaved'));
              } catch (err) {
                console.error('Failed to finish:', err);
              }
            },
          },
          {
            text: t('recording.existingActivity.discard'),
            style: 'destructive',
            onPress: async () => {
              try {
                await discardTracking();
              } catch (err) {
                console.error('Failed to discard:', err);
              }
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [hasExistingActivity, activity]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatPace = (seconds: number, meters: number): string => {
    if (meters === 0) return '--:--';
    const paceSeconds = (seconds / meters) * 1000;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  const handleStart = async () => {
    console.log('Start button pressed');

    // Request permissions first
    try {
      await requestActivityTrackingPermissions();
    } catch (err) {
      console.log('Permission error:', err);
    }

    // Start live activity with API
    try {
      await startTracking(selectedSport.id, `${selectedSport.name} Activity`);
      setPassedMilestones([]);
      console.log('Activity started successfully');
    } catch (err) {
      console.error('Failed to start activity:', err);
    }
  };

  const handlePause = async () => {
    try {
      await pauseTracking();
      console.log('Activity paused');
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  };

  const handleResume = async () => {
    try {
      await resumeTracking();
      console.log('Activity resumed');
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  };

  const handleStop = async () => {
    // First pause, then user can save or discard
    if (isTracking) {
      await handlePause();
    }
    // Keep activity in paused state so user can see final stats
    // They'll use Save or Discard buttons to finish
  };

  const handleSave = async () => {
    if (!activity) return;

    try {
      const finishedActivity = await finishTracking({
        title: `${selectedSport.name} Activity`,
        calories: Math.floor(localDuration * 0.15),
      });
      console.log('Activity saved:', finishedActivity);
      setPassedMilestones([]);
      Alert.alert(t('common.success'), t('recording.activitySaved'));
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleDiscard = async () => {
    Alert.alert(
      t('recording.discardActivity'),
      t('recording.discardConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recording.discard'),
          style: 'destructive',
          onPress: async () => {
            try {
              await discardTracking();
              setPassedMilestones([]);
              console.log('Activity discarded');
            } catch (err) {
              console.error('Failed to discard:', err);
            }
          },
        },
      ]
    );
  };

  const getMilestoneStatus = (milestone: (typeof mockMilestones)[0]) => {
    if (!passedMilestones.includes(milestone.distance)) {
      return { status: 'upcoming', color: colors.textMuted };
    }

    // Calculate time at this milestone (simplified)
    const timeAtMilestone = Math.floor(
      (localDuration * milestone.distance) / Math.max(distance, 1)
    );

    if (timeAtMilestone < milestone.bestTime) {
      return { status: 'record', color: colors.primary, label: t('recording.newRecord') };
    } else if (timeAtMilestone < milestone.avgTime) {
      return { status: 'good', color: colors.success, label: t('recording.aboveAverage') };
    }
    return { status: 'normal', color: colors.textSecondary, label: t('recording.completed') };
  };

  // Show loading overlay
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.pleaseWait')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('recording.title')}</Text>
        {activity && (
          <Text style={styles.activityId}>ID: {activity.id}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sport Type Selector */}
        {status === 'idle' && (
          <Card style={styles.sportSelector}>
            <Text style={styles.sectionTitle}>{t('recording.selectSport')}</Text>
            <View style={styles.sportGrid}>
              {sportTypes.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportButton,
                    selectedSport.id === sport.id && styles.sportButtonActive,
                  ]}
                  onPress={() => setSelectedSport(sport)}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={sport.icon}
                    size={28}
                    color={
                      selectedSport.id === sport.id
                        ? colors.white
                        : colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.sportLabel,
                      selectedSport.id === sport.id && styles.sportLabelActive,
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Current Activity Display */}
        {status !== 'idle' && (
          <View style={styles.currentSport}>
            <Ionicons
              name={selectedSport.icon}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.currentSportText}>{selectedSport.name}</Text>
            <Badge
              label={
                status === 'recording'
                  ? t('recording.status.recording')
                  : status === 'paused'
                    ? t('recording.status.paused')
                    : t('recording.status.finished')
              }
              variant={
                status === 'recording'
                  ? 'ongoing'
                  : status === 'paused'
                    ? 'upcoming'
                    : 'completed'
              }
            />
          </View>
        )}

        {/* Timer Display */}
        <Card style={styles.timerCard}>
          <Text style={styles.timerLabel}>{t('recording.duration')}</Text>
          <Text style={styles.timer}>{formatTime(localDuration)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="navigate-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.statValue}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>{t('recording.distance')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.statValue}>
                {formatPace(localDuration, distance)}
              </Text>
              <Text style={styles.statLabel}>{t('recording.pace')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={20} color={colors.primary} />
              <Text style={styles.statValue}>
                {Math.floor(localDuration * 0.15)}
              </Text>
              <Text style={styles.statLabel}>{t('recording.calories')}</Text>
            </View>
          </View>

          {/* Elevation gain */}
          {currentStats.elevation_gain > 0 && (
            <View style={styles.elevationRow}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={styles.elevationText}>
                {Math.round(currentStats.elevation_gain)} {t('recording.elevationGain')}
              </Text>
            </View>
          )}
        </Card>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.startButton, isLoading && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} size="large" />
              ) : (
                <>
                  <Ionicons name="play" size={40} color={colors.white} />
                  <Text style={styles.startButtonText}>{t('recording.start')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {status === 'recording' && (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={[styles.controlButton, isLoading && styles.buttonDisabled]}
                onPress={handlePause}
                disabled={isLoading}
              >
                <Ionicons name="pause" size={32} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.stopButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleStop}
                disabled={isLoading}
              >
                <Ionicons name="stop" size={32} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {status === 'paused' && (
            <View style={styles.pausedControls}>
              <View style={styles.recordingControls}>
                <TouchableOpacity
                  style={[styles.controlButton, isLoading && styles.buttonDisabled]}
                  onPress={handleResume}
                  disabled={isLoading}
                >
                  <Ionicons name="play" size={32} color={colors.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.finishedControls}>
                <Button
                  title={isLoading ? t('recording.saving') : t('recording.saveActivity')}
                  onPress={handleSave}
                  variant="primary"
                  style={styles.saveButton}
                  disabled={isLoading}
                />
                <Button
                  title={t('recording.discard')}
                  onPress={handleDiscard}
                  variant="ghost"
                  disabled={isLoading}
                />
              </View>
            </View>
          )}
        </View>

        {/* Milestones */}
        <Card style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>{t('recording.milestones')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('recording.compareWith', { sport: selectedSport.name.toLowerCase() })}
          </Text>

          {mockMilestones.map((milestone) => {
            const milestoneStatus = getMilestoneStatus(milestone);
            const isPassed = passedMilestones.includes(milestone.distance);

            return (
              <View
                key={milestone.distance}
                style={[
                  styles.milestoneRow,
                  isPassed && styles.milestoneRowPassed,
                ]}
              >
                <View style={styles.milestoneLeft}>
                  <View
                    style={[
                      styles.milestoneIcon,
                      isPassed && styles.milestoneIconPassed,
                    ]}
                  >
                    <Ionicons
                      name={isPassed ? 'checkmark' : 'flag-outline'}
                      size={16}
                      color={isPassed ? colors.white : colors.textMuted}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        isPassed && styles.milestoneLabelPassed,
                      ]}
                    >
                      {milestone.label}
                    </Text>
                    {isPassed && milestoneStatus.label && (
                      <Text
                        style={[
                          styles.milestoneStatus,
                          { color: milestoneStatus.color },
                        ]}
                      >
                        {milestoneStatus.label}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.milestoneRight}>
                  <Text style={styles.milestoneTime}>
                    {t('recording.best')}: {formatTime(milestone.bestTime)}
                  </Text>
                  <Text style={styles.milestoneTimeAvg}>
                    {t('recording.avg')}: {formatTime(milestone.avgTime)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Previous Activities Summary */}
        <Card style={styles.previousCard}>
          <Text style={styles.sectionTitle}>
            {t('recording.yourStats', { sport: selectedSport.name })}
          </Text>
          <View style={styles.prevStatsGrid}>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>23</Text>
              <Text style={styles.prevStatLabel}>{t('recording.activities')}</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>156 km</Text>
              <Text style={styles.prevStatLabel}>{t('recording.totalDistance')}</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>12:45h</Text>
              <Text style={styles.prevStatLabel}>{t('recording.totalTime')}</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>5:28</Text>
              <Text style={styles.prevStatLabel}>{t('recording.avgPace')}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {renderLoadingOverlay()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activityId: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  content: {
    padding: spacing.md,
  },
  sportSelector: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sportButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  sportLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  sportLabelActive: {
    color: colors.white,
  },
  currentSport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentSportText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timerCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  elevationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  elevationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  controls: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  startButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
  },
  pausedControls: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  finishedControls: {
    width: '100%',
    gap: spacing.md,
  },
  saveButton: {
    width: '100%',
  },
  milestonesCard: {
    marginBottom: spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  milestoneRowPassed: {
    backgroundColor: colors.successLight,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIconPassed: {
    backgroundColor: colors.primary,
  },
  milestoneLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  milestoneLabelPassed: {
    color: colors.textPrimary,
  },
  milestoneStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  milestoneRight: {
    alignItems: 'flex-end',
  },
  milestoneTime: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  milestoneTimeAvg: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  previousCard: {
    marginBottom: spacing.xl,
  },
  prevStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prevStatItem: {
    width: '50%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  prevStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  prevStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
