import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Button, Badge, BottomSheet, EventSelectionSheet, type BottomSheetOption, MapboxLiveMap, RecordingMapControls, ViewToggleButton, NearbyRoutesList } from '../../components';
import { useLiveActivityContext, usePermissions, useActivityStats, useOngoingEvents, useMilestones } from '../../hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event, TrainingWeek, SuggestedActivity } from '../../types/api';
import { useSportTypes, type SportTypeWithIcon } from '../../hooks/useSportTypes';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../hooks/useHaptics';
import { useActivityTimer } from '../../hooks/useActivityTimer';
import { useMilestoneTracking } from '../../hooks/useMilestoneTracking';
import * as Haptics from 'expo-haptics';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { RootStackParamList, MainTabParamList } from '../../navigation/types';
import { logger } from '../../services/logger';
import { api } from '../../services/api';
import { formatPaceDisplay, calculateAveragePace } from '../../utils/paceCalculator';
import { formatTime, formatDistance, formatTotalDistance, formatTotalTime, formatAvgPace } from '../../utils/formatters';

// Milestone labels for display
const MILESTONE_LABELS: Record<string, string> = {
  first_5km: '5 km',
  first_10km: '10 km',
  first_15km: '15 km',
  first_half_marathon: '21.1 km',
  first_30km: '30 km',
  first_marathon: '42.2 km',
  first_50km: '50 km',
  first_100km: '100 km',
};

const MILESTONE_ORDER = [
  'first_5km',
  'first_10km',
  'first_15km',
  'first_half_marathon',
  'first_30km',
  'first_marathon',
];

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

export function ActivityRecordingScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { requestActivityTrackingPermissions } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Record'>>();

  // Bottom sheets & modals
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [eventSheetVisible, setEventSheetVisible] = useState(false);

  // Activity options
  const [selectedSport, setSelectedSport] = useState<SportTypeWithIcon | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [skipAutoPost, setSkipAutoPost] = useState(false);
  const preselectedEventHandled = useRef(false);
  const isFinishingRef = useRef(false);

  // View mode state (stats vs map)
  const [viewMode, setViewMode] = useState<'stats' | 'map'>('stats');

  // Shadow track and nearby routes state
  const [nearbyRoutes, setNearbyRoutes] = useState<Array<any>>([]);
  const [selectedShadowTrack, setSelectedShadowTrack] = useState<any | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  // Training program state
  const [activeWeek, setActiveWeek] = useState<TrainingWeek | null>(null);

  // Animation for start button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Data hooks
  const { sportTypes, isLoading: sportsLoading } = useSportTypes();
  const { events: ongoingEvents, isLoading: eventsLoading, refresh: refreshEvents } = useOngoingEvents();
  const { stats: activityStats, isLoading: statsLoading } = useActivityStats(
    isAuthenticated && selectedSport ? { sportTypeId: selectedSport.id } : undefined
  );
  const { milestones: milestonesData, isLoading: milestonesLoading } = useMilestones(
    isAuthenticated && selectedSport ? selectedSport.id : undefined
  );

  // Live activity context
  const {
    activity,
    isTracking,
    isPaused,
    isLoading,
    error,
    currentStats,
    hasExistingActivity,
    trackingStatus,
    gpsProfile,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    discardTracking,
    clearError,
    livePoints,
    currentPosition,
  } = useLiveActivityContext();

  // Get ordered distance milestones
  const distanceMilestones = useMemo(() => {
    return milestonesData?.distance_single
      ?.filter((m) => MILESTONE_ORDER.includes(m.type))
      ?.sort((a, b) => MILESTONE_ORDER.indexOf(a.type) - MILESTONE_ORDER.indexOf(b.type)) || [];
  }, [milestonesData?.distance_single]);

  // Derive status
  const getStatus = (): RecordingStatus => {
    if (!activity) return 'idle';
    if (activity.status === 'completed') return 'finished';
    if (isPaused) return 'paused';
    if (isTracking) return 'recording';
    return 'idle';
  };

  const status = getStatus();
  const distance = currentStats.distance;

  // Timer and milestone tracking
  const { localDuration } = useActivityTimer(activity, isTracking, isPaused);
  const { passedMilestones, resetMilestones } = useMilestoneTracking(distance, distanceMilestones);

  // Find next milestone
  const nextMilestone = useMemo(() => {
    return distanceMilestones.find(m => !m.achieved && !passedMilestones.includes(m.threshold));
  }, [distanceMilestones, passedMilestones]);

  // Set default sport
  useEffect(() => {
    if (sportTypes.length > 0 && !selectedSport) {
      setSelectedSport(sportTypes[0]);
    }
  }, [sportTypes, selectedSport]);

  // Load active week for suggested activities
  useEffect(() => {
    const loadActiveWeek = async () => {
      if (!isAuthenticated || !selectedSport) {
        setActiveWeek(null);
        return;
      }

      try {
        const program = await api.getCurrentProgram();

        if (!program) {
          setActiveWeek(null);
          return;
        }

        // Only fetch active week if sport types match
        if (program.sport_type_id === selectedSport.id) {
          const weeks = await api.getWeeks();
          const currentWeek = weeks.find(w => w.status === 'current' || w.status === 'active');
          setActiveWeek(currentWeek || null);
        } else {
          setActiveWeek(null);
        }
      } catch (err: any) {
        logger.error('activity', 'Failed to load active week', { error: err });
        setActiveWeek(null);
      }
    };

    loadActiveWeek();
  }, [isAuthenticated, selectedSport]);

  // Handle preselected event
  useEffect(() => {
    const preselectedEvent = route.params?.preselectedEvent;
    if (preselectedEvent && !preselectedEventHandled.current) {
      setSelectedEvent(preselectedEvent);
      const eventSportTypeId = preselectedEvent.sport_type_id ?? preselectedEvent.sport_type?.id;
      if (eventSportTypeId && sportTypes.length > 0 && !sportsLoading) {
        const matchingSport = sportTypes.find(s => s.id === eventSportTypeId);
        if (matchingSport) {
          setSelectedSport(matchingSport);
          preselectedEventHandled.current = true;
        }
      }
    }
  }, [route.params?.preselectedEvent, sportTypes, sportsLoading]);

  // Pulse animation for start button
  useEffect(() => {
    if (status === 'idle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status, pulseAnim]);

  // Error handling
  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error, [{ text: t('common.ok'), onPress: clearError }]);
    }
  }, [error, clearError, t]);

  // Load view preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('@racefy_recording_view_mode')
      .then(saved => {
        if (saved === 'map' || saved === 'stats') {
          setViewMode(saved);
        }
      })
      .catch(() => {});
  }, []);

  // Save view preference when changed
  useEffect(() => {
    if (isTracking || isPaused) {
      AsyncStorage.setItem('@racefy_recording_view_mode', viewMode)
        .catch(() => {});
    }
  }, [viewMode, isTracking, isPaused]);

  // Fetch nearby routes when in map view + idle state
  useEffect(() => {
    const fetchNearbyRoutes = async () => {
      // Only fetch in map view, idle state (not tracking/paused), and when sport is selected
      if (viewMode === 'map' && !isTracking && !isPaused && selectedSport) {
        setLoadingRoutes(true);
        setRoutesError(null);

        try {
          // Get current position (might be null if tracking hasn't started)
          let lat: number;
          let lng: number;

          if (currentPosition) {
            // Use tracking position if available
            lat = currentPosition.lat;
            lng = currentPosition.lng;
            logger.debug('activity', 'Using current tracking position for nearby routes', { lat, lng });
          } else {
            // Fetch current location using expo-location (idle state)
            // First, check and request location permissions
            logger.debug('activity', 'Requesting location permissions for nearby routes');
            const hasPermissions = await requestActivityTrackingPermissions();

            if (!hasPermissions) {
              setRoutesError(t('recording.locationPermissionDenied'));
              logger.warn('activity', 'Location permissions denied for nearby routes');
              setLoadingRoutes(false);
              return;
            }

            logger.debug('activity', 'Fetching current location for nearby routes');
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            lat = location.coords.latitude;
            lng = location.coords.longitude;
            logger.debug('activity', 'Got current location for nearby routes', { lat, lng });
          }

          const routes = await api.getNearbyRoutes(lat, lng, 5000, selectedSport.id, 10);
          setNearbyRoutes(routes);
          logger.info('activity', 'Nearby routes fetched successfully', { count: routes.length });
        } catch (error: any) {
          setRoutesError(error.message || t('recording.routesError'));
          logger.error('activity', 'Failed to fetch nearby routes', { error });
        } finally {
          setLoadingRoutes(false);
        }
      }
    };

    fetchNearbyRoutes();
  }, [viewMode, isTracking, isPaused, currentPosition, selectedSport, t, requestActivityTrackingPermissions]);

  // Existing activity dialog
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
                logger.error('activity', 'Failed to resume from existing activity dialog', { error: err });
              }
            },
          },
          {
            text: t('recording.existingActivity.finish'),
            onPress: async () => {
              if (isFinishingRef.current) return;
              isFinishingRef.current = true;
              try {
                await finishTracking();
                Alert.alert(t('common.success'), t('recording.activitySaved'));
              } catch (err) {
                logger.error('activity', 'Failed to finish from existing activity dialog', { error: err });
              } finally {
                isFinishingRef.current = false;
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
                logger.error('activity', 'Failed to discard from existing activity dialog', { error: err });
              }
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [hasExistingActivity, activity]);

  // Format pace helpers
  const formatCurrentPace = (): string => {
    const { currentPace } = currentStats;
    const minDistance = gpsProfile?.minDistanceForPace ?? 50;
    if (currentStats.distance < minDistance) return '--:--';
    return formatPaceDisplay(currentPace);
  };

  const formatAvgPaceFromStats = (): string => {
    const minDistance = gpsProfile?.minDistanceForPace ?? 50;
    if (currentStats.distance < minDistance) return '--:--';
    const avgPace = calculateAveragePace(localDuration, currentStats.distance, minDistance);
    return formatPaceDisplay(avgPace);
  };

  const formatSuggestedDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    return minutes < 60 ? `${minutes}min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
  };

  const formatSuggestedDistance = (meters: number | null): string => {
    if (!meters) return '';
    return (meters / 1000).toFixed(1) + ' km';
  };

  // Action handlers
  const handleStart = async () => {
    logger.debug('activity', 'Start button pressed');
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    if (!selectedSport) {
      Alert.alert(t('recording.error'), t('recording.selectSportFirst'));
      return;
    }

    try {
      await requestActivityTrackingPermissions();
    } catch (err) {
      logger.error('activity', 'Permission error', { error: err });
    }

    try {
      await startTracking(selectedSport.id, `${selectedSport.name} Activity`, selectedEvent?.id);
      resetMilestones();
      setSelectedEvent(null);
      logger.activity('Activity started successfully from UI', { sportId: selectedSport.id });
    } catch (err) {
      logger.error('activity', 'Failed to start activity from UI', { error: err });
    }
  };

  const handlePause = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await pauseTracking();
      logger.activity('Activity paused from UI');
    } catch (err) {
      logger.error('activity', 'Failed to pause activity from UI', { error: err });
    }
  };

  const handleResume = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await resumeTracking();
      logger.activity('Activity resumed from UI');
    } catch (err) {
      logger.error('activity', 'Failed to resume activity from UI', { error: err });
    }
  };

  const handleStop = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (isTracking) {
      await handlePause();
    }
  };

  const handleSave = async () => {
    if (!activity || !selectedSport) return;
    if (isFinishingRef.current) return;

    isFinishingRef.current = true;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await finishTracking({
        title: `${selectedSport.name} Activity`,
        calories: Math.floor(localDuration * 0.15),
        skip_auto_post: skipAutoPost,
      });

      logger.activity('Activity saved from UI', {
        activityId: result?.activity?.id,
        hasPost: !!result?.post,
      });

      resetMilestones();
      setSkipAutoPost(false);

      if (result?.post) {
        if (result.post.status === 'published') {
          Alert.alert(t('common.success'), t('recording.activityShared'));
        } else if (result.post.status === 'draft') {
          Alert.alert(
            t('recording.activitySaved'),
            t('recording.draftCreated'),
            [
              { text: t('recording.later'), style: 'cancel' },
              {
                text: t('recording.viewDraft'),
                onPress: () => navigation.navigate('PostDetail', { postId: result.post!.id }),
              },
            ]
          );
        }
      } else {
        Alert.alert(t('common.success'), t('recording.activitySaved'));
      }
    } catch (err) {
      logger.error('activity', 'Failed to save activity from UI', { error: err });
    } finally {
      isFinishingRef.current = false;
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
              resetMilestones();
              logger.activity('Activity discarded from UI');
            } catch (err) {
              logger.error('activity', 'Failed to discard activity from UI', { error: err });
            }
          },
        },
      ]
    );
  };

  // Handle route selection for shadow track
  const handleRouteSelect = (route: any) => {
    setSelectedShadowTrack(route);
    logger.activity('Shadow track selected', { routeId: route.id, title: route.title });
  };

  // Handle clearing shadow track
  const handleClearShadowTrack = () => {
    setSelectedShadowTrack(null);
    logger.activity('Shadow track cleared');
  };

  // Bottom sheet options
  const addActivityOptions: BottomSheetOption[] = useMemo(() => [
    {
      id: 'record',
      icon: 'navigate-circle-outline',
      title: t('recording.addOptions.recordActivity'),
      description: t('recording.addOptions.recordDescription'),
      onPress: () => {},
      color: colors.primary,
    },
    {
      id: 'import',
      icon: 'cloud-upload-outline',
      title: t('recording.addOptions.importGpx'),
      description: t('recording.addOptions.importDescription'),
      onPress: () => navigation.navigate('GpxImport'),
      color: colors.success,
    },
  ], [t, colors.primary, colors.success, navigation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Sport Chip Selector
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSportChip = () => (
    <TouchableOpacity
      style={[styles.sportChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
      onPress={() => setSportModalVisible(true)}
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
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Compact Header (during recording/paused)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderCompactHeader = () => (
    <View style={[styles.compactHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
      <View style={styles.compactHeaderLeft}>
        {selectedSport && (
          <>
            <View style={[styles.compactSportIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={selectedSport.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.compactSportName, { color: colors.textPrimary }]}>
              {selectedSport.name}
            </Text>
          </>
        )}
      </View>
      <View style={styles.compactHeaderRight}>
        <Badge
          label={status === 'recording' ? t('recording.status.recording') : t('recording.status.paused')}
          variant={status === 'recording' ? 'ongoing' : 'upcoming'}
        />
        {trackingStatus && (
          <View style={[styles.gpsIndicator, {
            backgroundColor: trackingStatus.gpsSignal === 'good' ? colors.success + '20' :
                            trackingStatus.gpsSignal === 'weak' ? colors.warning + '20' :
                            colors.error + '20'
          }]}>
            <Ionicons
              name="locate"
              size={14}
              color={trackingStatus.gpsSignal === 'good' ? colors.success :
                     trackingStatus.gpsSignal === 'weak' ? colors.warning : colors.error}
            />
          </View>
        )}
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Hero Timer
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHeroTimer = () => (
    <View style={styles.heroTimerContainer}>
      <Text style={[styles.heroTimer, { color: colors.textPrimary }]}>
        {formatTime(localDuration)}
      </Text>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Live Stats Row
  // ═══════════════════════════════════════════════════════════════════════════
  const renderLiveStats = () => (
    <View style={[styles.liveStatsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.liveStatItem}>
        <Text style={[styles.liveStatValue, { color: colors.primary }]}>
          {formatDistance(distance)}
        </Text>
        <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
          {t('recording.distance')}
        </Text>
      </View>
      <View style={[styles.liveStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.liveStatItem}>
        <Text style={[styles.liveStatValue, { color: colors.primary }]}>
          {formatCurrentPace()}
        </Text>
        <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
          {t('recording.currentPace')}
        </Text>
      </View>
      <View style={[styles.liveStatDivider, { backgroundColor: colors.border }]} />
      <View style={styles.liveStatItem}>
        <Text style={[styles.liveStatValue, { color: colors.primary }]}>
          {formatAvgPaceFromStats()}
        </Text>
        <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
          {t('recording.avgPace')}
        </Text>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Suggested Activities Slider
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSuggestedActivitiesSlider = () => {
    if (!activeWeek?.suggested_activities || activeWeek.suggested_activities.length === 0) {
      return null;
    }

    const suggestedActivities = activeWeek.suggested_activities;

    return (
      <View style={styles.suggestedActivitiesSection}>
        <View style={styles.suggestedActivitiesHeader}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.suggestedActivitiesTitle, { color: colors.textPrimary }]}>
            {t('recording.plannedThisWeek')}
          </Text>
        </View>

        <FlatList
          horizontal
          data={suggestedActivities}
          keyExtractor={(item) => `suggested-${item.id}`}
          renderItem={({ item }: { item: SuggestedActivity }) => (
            <View
              style={[
                styles.suggestedActivityCard,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.suggestedActivityHeader, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.suggestedActivityOrder, { color: colors.primary }]}>
                  {t('recording.session')} {item.session_order}
                </Text>
              </View>

              <View style={styles.suggestedActivityBody}>
                <Text style={[styles.suggestedActivityType, { color: colors.textPrimary }]}>
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
                        {formatSuggestedDistance(item.target_distance_meters)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedActivitiesList}
        />
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Next Milestone Indicator
  // ═══════════════════════════════════════════════════════════════════════════
  const renderNextMilestone = () => {
    if (!isAuthenticated || !nextMilestone) return null;

    const progressPercent = Math.min(100, Math.round((distance / nextMilestone.threshold) * 100));
    const remaining = Math.max(0, nextMilestone.threshold - distance);

    return (
      <View style={[styles.milestoneIndicator, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.milestoneIndicatorLeft}>
          <Ionicons name="flag" size={16} color={colors.primary} />
          <Text style={[styles.milestoneIndicatorText, { color: colors.textSecondary }]}>
            {t('recording.nextMilestone')}: {MILESTONE_LABELS[nextMilestone.type]}
          </Text>
        </View>
        <View style={styles.milestoneIndicatorRight}>
          <Text style={[styles.milestoneIndicatorProgress, { color: colors.primary }]}>
            {formatDistance(remaining)} {t('recording.toGo')}
          </Text>
        </View>
        <View style={[styles.milestoneProgressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.milestoneProgressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Map View (Idle, Recording, or Paused)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMapView = () => {
    // Show controls only during recording/paused (not in idle preview)
    const showControls = isTracking || isPaused;
    const showNearbyRoutes = !isTracking && !isPaused;

    logger.debug('activity', 'Rendering map view', {
      showControls,
      showNearbyRoutes,
      livePointsCount: livePoints.length,
      hasCurrentPosition: !!currentPosition,
      nearbyRoutesCount: nearbyRoutes.length,
    });

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <MapboxLiveMap
          livePoints={livePoints}
          currentPosition={currentPosition}
          gpsSignalQuality={trackingStatus.gpsSignal}
          height={showNearbyRoutes ? 400 : undefined}
          followUser={true}
          // Shadow track & nearby routes props
          nearbyRoutes={showNearbyRoutes ? nearbyRoutes : undefined}
          shadowTrack={selectedShadowTrack?.track_data || null}
          selectedRouteId={
            showNearbyRoutes && selectedShadowTrack
              ? selectedShadowTrack.id
              : null
          }
          onRouteSelect={(routeId) => {
            const route = nearbyRoutes.find((r: any) => r.id === routeId);
            if (route) handleRouteSelect(route);
          }}
        />
        {showNearbyRoutes && (
          <NearbyRoutesList
            routes={nearbyRoutes}
            selectedRouteId={selectedShadowTrack?.id || null}
            onRouteSelect={handleRouteSelect}
            isLoading={loadingRoutes}
            error={routesError}
          />
        )}
        {showControls && (
          <RecordingMapControls
            duration={localDuration}
            distance={currentStats.distance}
            currentPace={currentStats.currentPace}
            isPaused={isPaused}
            isLoading={isLoading}
            onPause={handlePause}
            onStop={handleStop}
            onResume={handleResume}
            // Shadow track props
            shadowTrackTitle={selectedShadowTrack?.title || null}
            onClearShadowTrack={handleClearShadowTrack}
          />
        )}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Idle Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderIdleLayout = () => (
    <View style={styles.idleContainer}>
      {/* Sport Selector */}
      <View style={styles.idleSportSection}>
        {renderSportChip()}
      </View>

      {/* Start Button - Hero */}
      <View style={styles.startSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={handleStart}
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
            refreshEvents();
            setEventSheetVisible(true);
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
                  setSelectedEvent(null);
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
                        {t('recording.nextMilestone')}: {MILESTONE_LABELS[nextMilestone.type]} ({Math.round(nextMilestone.progress * 100)}%)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Recording Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRecordingLayout = () => (
    <View style={styles.recordingContainer}>
      {renderCompactHeader()}

      <View style={styles.recordingContent}>
        {renderHeroTimer()}
        {renderLiveStats()}

        {/* Elevation (if available) */}
        {currentStats.elevation_gain > 0 && (
          <View style={[styles.elevationRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.elevationText, { color: colors.textSecondary }]}>
              {Math.round(currentStats.elevation_gain)}m {t('recording.elevationGain')}
            </Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton, { backgroundColor: colors.primary }]}
            onPress={handlePause}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={32} color={colors.white} />
            <Text style={styles.controlButtonText}>{t('recording.pause')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton, { backgroundColor: colors.error }]}
            onPress={handleStop}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={32} color={colors.white} />
            <Text style={styles.controlButtonText}>{t('recording.stop')}</Text>
          </TouchableOpacity>
        </View>

        {renderNextMilestone()}
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Paused Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPausedLayout = () => (
    <View style={styles.pausedContainer}>
      {renderCompactHeader()}

      <View style={styles.pausedContent}>
        {renderHeroTimer()}
        {renderLiveStats()}

        {/* Resume Button */}
        <TouchableOpacity
          style={[styles.resumeButton, { backgroundColor: colors.primary }]}
          onPress={handleResume}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="play" size={28} color={colors.white} />
          <Text style={styles.resumeButtonText}>{t('recording.resume')}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

        {/* Save Options */}
        <View style={styles.saveSection}>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.skipPostRow}
              onPress={() => setSkipAutoPost(!skipAutoPost)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Switch
                value={skipAutoPost}
                onValueChange={setSkipAutoPost}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={skipAutoPost ? colors.primary : colors.white}
                disabled={isLoading}
              />
              <Text style={[styles.skipPostText, { color: colors.textSecondary }]}>
                {t('recording.skipAutoPost')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.success }]}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                <Text style={styles.saveButtonText}>{t('recording.saveActivity')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.discardButton}
            onPress={handleDiscard}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.discardButtonText, { color: colors.error }]}>
              {t('recording.discard')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading Overlay
  // ═══════════════════════════════════════════════════════════════════════════
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.pleaseWait')}</Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Idle Header */}
      {status === 'idle' && (
        <View style={[styles.idleHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>{t('recording.title')}</Text>
          <TouchableOpacity
            onPress={() => setShowAddOptions(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Based on Status and View Mode */}
      {viewMode === 'map' ? (
        renderMapView()
      ) : (
        <>
          {status === 'idle' && renderIdleLayout()}
          {status === 'recording' && renderRecordingLayout()}
          {status === 'paused' && renderPausedLayout()}
        </>
      )}

      {renderLoadingOverlay()}

      {/* View toggle button - visible for GPS-enabled activities only */}
      {/* Show in idle state (preview), recording, and paused */}
      {gpsProfile?.enabled && (
        <ViewToggleButton
          currentView={viewMode}
          onToggle={() => {
            const newMode = viewMode === 'stats' ? 'map' : 'stats';
            logger.info('activity', 'Toggling view mode', { from: viewMode, to: newMode });
            setViewMode(newMode);
          }}
        />
      )}

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
            <TouchableOpacity onPress={() => setSportModalVisible(false)} style={styles.modalCloseButton}>
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
                    <Ionicons name={sport.icon} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
                  </View>
                  <Text style={[styles.modalSportName, { color: colors.textPrimary }, isSelected && { fontWeight: '600', color: colors.primary }]}>
                    {sport.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Bottom Sheets */}
      <BottomSheet
        visible={showAddOptions}
        onClose={() => setShowAddOptions(false)}
        title={t('recording.addOptions.title')}
        options={addActivityOptions}
      />

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

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Idle Header
  // ─────────────────────────────────────────────────────────────────────────
  idleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  idleTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Compact Header (Recording/Paused)
  // ─────────────────────────────────────────────────────────────────────────
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactSportIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactSportName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  gpsIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Sport Chip Selector
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Idle Layout
  // ─────────────────────────────────────────────────────────────────────────
  idleContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  idleSportSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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

  // ─────────────────────────────────────────────────────────────────────────
  // Event Link Row
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Quick Stats Card
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Hero Timer
  // ─────────────────────────────────────────────────────────────────────────
  heroTimerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroTimer: {
    fontSize: 72,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Live Stats
  // ─────────────────────────────────────────────────────────────────────────
  liveStatsContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
  },
  liveStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  liveStatLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  liveStatDivider: {
    width: 1,
    marginVertical: spacing.xs,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Elevation Row
  // ─────────────────────────────────────────────────────────────────────────
  elevationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  elevationText: {
    fontSize: fontSize.sm,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Milestone Indicator
  // ─────────────────────────────────────────────────────────────────────────
  milestoneIndicator: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  milestoneIndicatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  milestoneIndicatorRight: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
  },
  milestoneIndicatorText: {
    fontSize: fontSize.sm,
  },
  milestoneIndicatorProgress: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  milestoneProgressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Recording Layout
  // ─────────────────────────────────────────────────────────────────────────
  recordingContainer: {
    flex: 1,
  },
  recordingContent: {
    flex: 1,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  controlButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pauseButton: {},
  stopButton: {},
  controlButtonText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 4,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Paused Layout
  // ─────────────────────────────────────────────────────────────────────────
  pausedContainer: {
    flex: 1,
  },
  pausedContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  resumeButtonText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    marginVertical: spacing.xl,
  },
  saveSection: {
    gap: spacing.md,
  },
  skipPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  skipPostText: {
    fontSize: fontSize.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  discardButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Loading Overlay
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Modal
  // ─────────────────────────────────────────────────────────────────────────
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
  modalSportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  modalSportName: {
    flex: 1,
    fontSize: fontSize.md,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Suggested Activities Slider
  // ─────────────────────────────────────────────────────────────────────────
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
    alignItems: 'center',
  },
  suggestedActivityOrder: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
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