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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button, Badge, BottomSheet, EventSelectionSheet, type BottomSheetOption } from '../../components';
import { useLiveActivity, usePermissions, useActivityStats, useOngoingEvents } from '../../hooks';
import type { Event } from '../../types/api';
import { useSportTypes, type SportTypeWithIcon } from '../../hooks/useSportTypes';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../hooks/useHaptics';
import * as Haptics from 'expo-haptics';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { RootStackParamList, MainTabParamList } from '../../navigation/types';

// Mock data for milestones based on previous activities
const mockMilestones = [
  { distance: 1000, label: '1 km', bestTime: 298, avgTime: 325 },
  { distance: 2000, label: '2 km', bestTime: 612, avgTime: 658 },
  { distance: 3000, label: '3 km', bestTime: 935, avgTime: 1005 },
  { distance: 5000, label: '5 km', bestTime: 1580, avgTime: 1720 },
  { distance: 10000, label: '10 km', bestTime: 3250, avgTime: 3540 },
];

// Number of sports to show initially before "Show more"
const INITIAL_SPORTS_COUNT = 4;

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

export function ActivityRecordingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();
  const { requestActivityTrackingPermissions } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Record'>>();
  const [showAddOptions, setShowAddOptions] = useState(false);
  const { sportTypes, isLoading: sportsLoading } = useSportTypes();
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

  const [selectedSport, setSelectedSport] = useState<SportTypeWithIcon | null>(null);
  const [showAllSports, setShowAllSports] = useState(false);
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventSheetVisible, setEventSheetVisible] = useState(false);
  const preselectedEventHandled = useRef(false);

  // Fetch ongoing events where user is registered
  const { events: ongoingEvents, isLoading: eventsLoading, refresh: refreshEvents } = useOngoingEvents();

  // Fetch stats for selected sport type (only when authenticated)
  const { stats: activityStats, isLoading: statsLoading } = useActivityStats(
    isAuthenticated && selectedSport ? selectedSport.id : undefined
  );

  // Set default sport when sports are loaded
  useEffect(() => {
    if (sportTypes.length > 0 && !selectedSport) {
      setSelectedSport(sportTypes[0]);
    }
  }, [sportTypes, selectedSport]);

  // Handle preselected event from navigation params
  useEffect(() => {
    const preselectedEvent = route.params?.preselectedEvent;
    if (preselectedEvent && !preselectedEventHandled.current) {
      // Set the event immediately
      setSelectedEvent(preselectedEvent);

      // Get sport type ID - fallback to sport_type.id if sport_type_id is undefined
      const eventSportTypeId = preselectedEvent.sport_type_id ?? preselectedEvent.sport_type?.id;

      // Only mark as fully handled when we've also set the sport type
      // This allows the effect to run again when sportTypes load
      if (eventSportTypeId && sportTypes.length > 0 && !sportsLoading) {
        const matchingSport = sportTypes.find(s => s.id === eventSportTypeId);
        if (matchingSport) {
          setSelectedSport(matchingSport);
          preselectedEventHandled.current = true;
        }
      }
    }
  }, [route.params?.preselectedEvent, sportTypes, sportsLoading]);

  // Sports to display (first N or all)
  const displayedSports = showAllSports
    ? sportTypes
    : sportTypes.slice(0, INITIAL_SPORTS_COUNT);
  const hasMoreSports = sportTypes.length > INITIAL_SPORTS_COUNT;
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

  const formatTotalDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(0)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatTotalTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}h`;
    }
    return `${mins}m`;
  };

  const formatAvgPace = (avgSpeed: number): string => {
    if (!avgSpeed || avgSpeed === 0) return '--:--';
    // avgSpeed is in m/s, convert to min/km
    const paceSeconds = 1000 / avgSpeed;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    console.log('Start button pressed');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    if (!selectedSport) {
      Alert.alert(t('recording.error'), t('recording.selectSportFirst'));
      return;
    }

    // Request permissions first
    try {
      await requestActivityTrackingPermissions();
    } catch (err) {
      console.log('Permission error:', err);
    }

    // Start live activity with API
    try {
      await startTracking(
        selectedSport.id,
        `${selectedSport.name} Activity`,
        selectedEvent?.id
      );
      setPassedMilestones([]);
      setSelectedEvent(null); // Reset event selection after starting
      console.log('Activity started successfully');
    } catch (err) {
      console.error('Failed to start activity:', err);
    }
  };

  const handlePause = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await pauseTracking();
      console.log('Activity paused');
    } catch (err) {
      console.error('Failed to pause:', err);
    }
  };

  const handleResume = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await resumeTracking();
      console.log('Activity resumed');
    } catch (err) {
      console.error('Failed to resume:', err);
    }
  };

  const handleStop = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    // First pause, then user can save or discard
    if (isTracking) {
      await handlePause();
    }
    // Keep activity in paused state so user can see final stats
    // They'll use Save or Discard buttons to finish
  };

  const handleSave = async () => {
    if (!activity || !selectedSport) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

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
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
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

  // Bottom sheet options for adding activity
  const addActivityOptions: BottomSheetOption[] = [
    {
      id: 'record',
      icon: 'navigate-circle-outline',
      title: t('recording.addOptions.recordActivity'),
      description: t('recording.addOptions.recordDescription'),
      onPress: () => {
        // Just close sheet, user will see sport selector
      },
      color: colors.primary,
    },
    {
      id: 'import',
      icon: 'cloud-upload-outline',
      title: t('recording.addOptions.importGpx'),
      description: t('recording.addOptions.importDescription'),
      onPress: () => {
        navigation.navigate('GpxImport');
      },
      color: colors.success,
    },
  ];

  // Show loading overlay
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.pleaseWait')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('recording.title')}</Text>
        <View style={styles.headerRight}>
          {activity && (
            <Text style={[styles.activityId, { color: colors.textMuted }]}>ID: {activity.id}</Text>
          )}
          {status === 'idle' && (
            <TouchableOpacity
              onPress={() => setShowAddOptions(true)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sport Type Selector */}
        {status === 'idle' && (
          <Card style={styles.sportSelector}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('recording.selectSport')}</Text>
            {sportsLoading ? (
              <View style={styles.sportsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.sportGrid}>
                  {displayedSports.map((sport) => (
                    <TouchableOpacity
                      key={sport.id}
                      style={[
                        styles.sportButton,
                        { backgroundColor: colors.primary + '20' },
                        selectedSport?.id === sport.id && [styles.sportButtonActive, { backgroundColor: colors.primary, borderColor: colors.primaryDark }],
                      ]}
                      onPress={() => setSelectedSport(sport)}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={sport.icon}
                        size={28}
                        color={
                          selectedSport?.id === sport.id
                            ? colors.white
                            : colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.sportLabel,
                          { color: colors.primary },
                          selectedSport?.id === sport.id && styles.sportLabelActive,
                        ]}
                      >
                        {sport.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {hasMoreSports && (
                  <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() => setSportModalVisible(true)}
                  >
                    <Text style={[styles.showMoreText, { color: colors.primary }]}>
                      {t('recording.showMoreSports', { count: sportTypes.length - INITIAL_SPORTS_COUNT })}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card>
        )}

        {/* Event Selection (only when idle and authenticated) */}
        {status === 'idle' && isAuthenticated && (
          <Card style={styles.eventSelector}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('recording.linkToEvent')}
            </Text>
            <View
              style={[
                styles.eventSelectorButton,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedEvent && { borderColor: colors.primary },
              ]}
            >
              {selectedEvent ? (
                <>
                  <TouchableOpacity
                    style={styles.eventSelectorTouchable}
                    onPress={() => {
                      refreshEvents();
                      setEventSheetVisible(true);
                    }}
                    disabled={isLoading}
                  >
                    <View style={[styles.eventIconContainer, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons
                        name={selectedEvent.sport_type?.icon as any || 'calendar-outline'}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.eventSelectorContent}>
                      <Text style={[styles.eventSelectorTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {selectedEvent.post?.title || t('eventDetail.untitled')}
                      </Text>
                      <Text style={[styles.eventSelectorSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {selectedEvent.location_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedEvent(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eventClearButton}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.eventSelectorTouchable}
                  onPress={() => {
                    refreshEvents();
                    setEventSheetVisible(true);
                  }}
                  disabled={isLoading}
                >
                  <View style={[styles.eventIconContainer, { backgroundColor: colors.textMuted + '20' }]}>
                    <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.eventSelectorPlaceholder, { color: colors.textSecondary }]}>
                    {t('recording.selectEvent')}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {/* Current Activity Display */}
        {status !== 'idle' && selectedSport && (
          <View style={styles.currentSport}>
            <Ionicons
              name={selectedSport.icon}
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.currentSportText, { color: colors.textPrimary }]}>{selectedSport.name}</Text>
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
          <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>{t('recording.duration')}</Text>
          <Text style={[styles.timer, { color: colors.textPrimary }]}>{formatTime(localDuration)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="navigate-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDistance(distance)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('recording.distance')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons
                name="speedometer-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatPace(localDuration, distance)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('recording.pace')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {Math.floor(localDuration * 0.15)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('recording.calories')}</Text>
            </View>
          </View>

          {/* Elevation gain */}
          {currentStats.elevation_gain > 0 && (
            <View style={styles.elevationRow}>
              <Ionicons name="trending-up" size={16} color={colors.primary} />
              <Text style={[styles.elevationText, { color: colors.textSecondary }]}>
                {Math.round(currentStats.elevation_gain)} {t('recording.elevationGain')}
              </Text>
            </View>
          )}
        </Card>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, isLoading && styles.buttonDisabled]}
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
                style={[styles.controlButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
                onPress={handlePause}
                disabled={isLoading}
              >
                <Ionicons name="pause" size={32} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  { backgroundColor: colors.error },
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
                  style={[styles.controlButton, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]}
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('recording.milestones')}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {t('recording.compareWith', { sport: selectedSport?.name?.toLowerCase() || '' })}
          </Text>

          {mockMilestones.map((milestone) => {
            const milestoneStatus = getMilestoneStatus(milestone);
            const isPassed = passedMilestones.includes(milestone.distance);

            return (
              <View
                key={milestone.distance}
                style={[
                  styles.milestoneRow,
                  { borderBottomColor: colors.border },
                  isPassed && [styles.milestoneRowPassed, { backgroundColor: colors.success + '15' }],
                ]}
              >
                <View style={styles.milestoneLeft}>
                  <View
                    style={[
                      styles.milestoneIcon,
                      { backgroundColor: colors.border },
                      isPassed && { backgroundColor: colors.primary },
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
                        { color: colors.textSecondary },
                        isPassed && { color: colors.textPrimary },
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
                  <Text style={[styles.milestoneTime, { color: colors.textPrimary }]}>
                    {t('recording.best')}: {formatTime(milestone.bestTime)}
                  </Text>
                  <Text style={[styles.milestoneTimeAvg, { color: colors.textMuted }]}>
                    {t('recording.avg')}: {formatTime(milestone.avgTime)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Previous Activities Summary */}
        {isAuthenticated && (
          <Card style={styles.previousCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('recording.yourStats', { sport: selectedSport?.name || '' })}
            </Text>
            {statsLoading ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : activityStats ? (
              <View style={styles.prevStatsGrid}>
                <View style={styles.prevStatItem}>
                  <Text style={[styles.prevStatValue, { color: colors.primary }]}>
                    {activityStats.count}
                  </Text>
                  <Text style={[styles.prevStatLabel, { color: colors.textSecondary }]}>
                    {t('recording.activities')}
                  </Text>
                </View>
                <View style={styles.prevStatItem}>
                  <Text style={[styles.prevStatValue, { color: colors.primary }]}>
                    {formatTotalDistance(activityStats.totals.distance)}
                  </Text>
                  <Text style={[styles.prevStatLabel, { color: colors.textSecondary }]}>
                    {t('recording.totalDistance')}
                  </Text>
                </View>
                <View style={styles.prevStatItem}>
                  <Text style={[styles.prevStatValue, { color: colors.primary }]}>
                    {formatTotalTime(activityStats.totals.duration)}
                  </Text>
                  <Text style={[styles.prevStatLabel, { color: colors.textSecondary }]}>
                    {t('recording.totalTime')}
                  </Text>
                </View>
                <View style={styles.prevStatItem}>
                  <Text style={[styles.prevStatValue, { color: colors.primary }]}>
                    {formatAvgPace(activityStats.averages.speed)}
                  </Text>
                  <Text style={[styles.prevStatLabel, { color: colors.textSecondary }]}>
                    {t('recording.avgPace')}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noStatsContainer}>
                <Text style={[styles.noStatsText, { color: colors.textMuted }]}>
                  {t('recording.noStats', { sport: selectedSport?.name?.toLowerCase() || '' })}
                </Text>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {renderLoadingOverlay()}

      {/* Sport Selection Modal */}
      <Modal
        visible={sportModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSportModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('recording.selectSport')}</Text>
            <TouchableOpacity
              onPress={() => setSportModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={sportTypes}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalList}
            renderItem={({ item: sport }) => {
              const isSelected = selectedSport?.id === sport.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalSportItem,
                    { backgroundColor: colors.cardBackground },
                    isSelected && { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setSelectedSport(sport);
                    setSportModalVisible(false);
                  }}
                >
                  <View style={[styles.modalSportIcon, { backgroundColor: colors.background }, isSelected && { backgroundColor: colors.primary + '30' }]}>
                    <Ionicons
                      name={sport.icon}
                      size={24}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.modalSportName, { color: colors.textPrimary }, isSelected && { fontWeight: '600', color: colors.primary }]}>
                    {sport.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Add Activity Options Bottom Sheet */}
      <BottomSheet
        visible={showAddOptions}
        onClose={() => setShowAddOptions(false)}
        title={t('recording.addOptions.title')}
        options={addActivityOptions}
      />

      {/* Event Selection Sheet */}
      <EventSelectionSheet
        visible={eventSheetVisible}
        onClose={() => setEventSheetVisible(false)}
        onSelect={setSelectedEvent}
        events={ongoingEvents}
        selectedEvent={selectedEvent}
        isLoading={eventsLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  activityId: {
    fontSize: fontSize.xs,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
  },
  sportSelector: {
    marginBottom: spacing.md,
  },
  eventSelector: {
    marginBottom: spacing.md,
  },
  eventSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  eventIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventSelectorContent: {
    flex: 1,
  },
  eventSelectorTitle: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  eventSelectorSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  eventSelectorPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
  },
  eventSelectorTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventClearButton: {
    padding: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sportButtonActive: {
    // backgroundColor and borderColor applied inline
  },
  sportLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  sportLabelActive: {
    color: '#ffffff',
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
  },
  timerCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
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
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
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
  },
  controls: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  startButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: '#ffffff',
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopButton: {
    // backgroundColor applied inline
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
  },
  milestoneRowPassed: {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIconPassed: {
    // backgroundColor applied inline
  },
  milestoneLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  milestoneLabelPassed: {
    // color applied inline
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
  },
  milestoneTimeAvg: {
    fontSize: fontSize.xs,
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
  },
  prevStatLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  statsLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noStatsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noStatsText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
  },
  sportsLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  showMoreText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
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
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalList: {
    padding: spacing.md,
  },
  modalSportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  modalSportItemSelected: {
    // styles applied inline
  },
  modalSportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modalSportIconSelected: {
    // styles applied inline
  },
  modalSportName: {
    flex: 1,
    fontSize: fontSize.md,
  },
  modalSportNameSelected: {
    // styles applied inline
  },
});
