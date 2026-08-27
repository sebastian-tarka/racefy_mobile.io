import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  RouteProp,
  TabActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  announceEnd,
  announceStart,
  triggerHaptic,
  useActivityTimer,
  useAudioCoach,
  useAudioCoachSettings,
  useAuth,
  useDefaultSport,
  useDevRunSimulator,
  useFadeToast,
  useGpsHealthCheck,
  useHealthEnrichment,
  useLiveActivityContext,
  useLivePreferences,
  useMapStyleCycler,
  useMilestones,
  useMilestoneTracking,
  useMyPlannedRoutes,
  useNearbyRoutes,
  useOngoingEvents,
  usePermissions,
  usePreviewLocation,
  useSportTypes,
  useSubscription,
  useTheme,
  useUnits,
} from '../../hooks';
import {
  BottomSheet,
  type BottomSheetOption,
  EventSelectionSheet,
  FeatureGate,
  GpsHealthCheckCard,
  LiveAthleteInbox,
  LiveBroadcastControl,
  MapboxLiveMap,
  NearbyRoutesHorizontalPanel,
  RecordingMapControls,
  ScreenContainer,
} from '../../components';
import {
  isBatteryOptimized,
  requestIgnoreBatteryOptimizations,
} from '../../services/batteryOptimization';
import { NavigationOverlay } from '../../components/NavigationOverlay';
import { useLiveNavigation } from '../../hooks/useLiveNavigation';
import { useRouteApproachPath } from '../../hooks/useRouteApproachPath';
import { useNavigationAnnouncer } from '../../hooks/useNavigationAnnouncer';
import { useRouteTurnInstructions } from '../../hooks/useRouteTurnInstructions';
import { routeKey } from '../../utils/routeKey';
import { IdleView } from './recording/IdleView';
import { RecordingView } from './recording/RecordingView';
import { PausedView } from './recording/PausedView';
import { SportSelectionModal } from './recording/SportSelectionModal';
import { RouteSelectionModal } from './recording/RouteSelectionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event } from '../../types/api';
import * as Haptics from 'expo-haptics';
import { borderRadius, fontSize, spacing, msFont } from '../../theme';
import type { MainTabParamList, RootStackParamList } from '../../navigation';
import { logger } from '../../services/logger';
import { formatTime } from '../../utils/formatters';

const MILESTONE_ORDER = [
  'first_5km',
  'first_10km',
  'first_15km',
  'first_half_marathon',
  'first_30km',
  'first_marathon',
];

const AUDIO_COACH_SETTINGS_KEY = '@racefy:audioCoach:settings';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

export function ActivityRecordingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { formatDistance: fmtDistance } = useUnits();

  // Tab bar is hidden on this screen, so offset is just safe areawymoge
  const tabBarHeight = insets.bottom;
  const fabBottom = tabBarHeight + spacing.md;
  const { isAuthenticated, user } = useAuth();
  const { canUse, tier } = useSubscription();
  const canUseAdvancedStats = canUse('advanced_stats');
  const canUseAiPostOnFinish = canUse('ai_post_on_finish');
  const { requestActivityTrackingPermissions } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Record'>>();

  // Hide bottom tab bar when this screen is focused.
  // Cast needed: navigation is typed as NativeStack but at runtime is BottomTab navigation.
  useFocusEffect(
    useCallback(() => {
      (navigation as any).setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        (navigation as any).setOptions({ tabBarStyle: undefined });
      };
    }, [navigation]),
  );

  // Data hooks (declared early — needed for useDefaultSport below)
  const { sportTypes, isLoading: sportsLoading } = useSportTypes();

  // Bottom sheets & modals
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [eventSheetVisible, setEventSheetVisible] = useState(false);
  const [routeSelectionModalVisible, setRouteSelectionModalVisible] = useState(false);

  // Activity options
  const [selectedSport, setSelectedSport] = useDefaultSport(
    sportTypes,
    isAuthenticated,
    sportsLoading,
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [skipAutoPost, setSkipAutoPost] = useState(false);
  const preselectedEventHandled = useRef(false);
  const isFinishingRef = useRef(false);

  // View mode state (stats vs map)
  const [viewMode, setViewMode] = useState<'stats' | 'map'>('stats');

  // Nearby routes visibility toggle (default hidden)
  const [showNearbyRoutesToggle, setShowNearbyRoutesToggle] = useState(false);

  // Map follow user state (false when user pans/zooms the map)
  const [followUser, setFollowUser] = useState(true);

  // Map style selection + the self-hiding "style changed" toast (useMapStyleCycler).
  const {
    mapStyle,
    cycle: handleMapStyleToggle,
    toastVisible: showStyleToast,
    toastOpacity: styleToastOpacity,
  } = useMapStyleCycler(viewMode);

  // Animation for toggle buttons position
  const toggleButtonsPosition = useRef(new Animated.Value(0)).current;

  // Screen lock. The lock + audio-coach toasts share one self-dismissing fade
  // mechanism (useFadeToast); the boolean payload styles the toast (locked / enabled).
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const lockToast = useFadeToast<boolean>();
  const audioCoachToast = useFadeToast<boolean>();

  // Data hooks
  const { events: ongoingEvents, isLoading: eventsLoading } = useOngoingEvents();
  const { milestones: milestonesData } = useMilestones(
    isAuthenticated && canUseAdvancedStats && selectedSport ? selectedSport.id : undefined,
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
    livePointsVersion,
    currentPosition,
  } = useLiveActivityContext();

  const isIdle = !isTracking && !isPaused;

  // Live broadcasting: state is owned here so the toggle and the incoming
  // message inbox stay in step.
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { preferences: livePreferences } = useLivePreferences();
  /**
   * Height of the broadcast row, measured rather than assumed.
   *
   * The row sits in normal flow and pushes the map down, but the floating map
   * controls are positioned absolutely against the screen and know nothing
   * about it — so without this offset they land on top of the broadcast pill.
   * Measured because the row's height depends on the visibility label and on
   * whether the "share link" button and message inbox are present.
   */
  const [liveRowHeight, setLiveRowHeight] = useState(0);

  // Pre-run GPS health check (permissions, battery optimization, notifications)
  const { health: gpsHealth, refresh: refreshGpsHealth } = useGpsHealthCheck(
    isIdle && (gpsProfile?.enabled ?? false),
  );

  // Audio Coach — session-level toggle (overrides settings.enabled for this session only)
  const { settings: audioCoachSettings, loadSettings: loadAudioCoachSettings } =
    useAudioCoachSettings();
  useEffect(() => {
    loadAudioCoachSettings();
  }, [loadAudioCoachSettings]);
  const [audioCoachSessionEnabled, setAudioCoachSessionEnabled] = useState<boolean | null>(null);
  const isAudioCoachActive = audioCoachSessionEnabled ?? audioCoachSettings.enabled;

  // Persist audio coach session toggle to AsyncStorage so the background task respects it.
  // On Android the background location task runs continuously (even in foreground)
  // and reads settings from AsyncStorage — without this sync it ignores the toggle.
  const handleToggleAudioCoach = useCallback(() => {
    triggerHaptic();
    const newEnabled = !(audioCoachSessionEnabled ?? audioCoachSettings.enabled);
    setAudioCoachSessionEnabled(newEnabled);

    // Sync to AsyncStorage for background task
    AsyncStorage.getItem(AUDIO_COACH_SETTINGS_KEY)
      .then((json) => {
        const stored = json ? JSON.parse(json) : { ...audioCoachSettings };
        stored.enabled = newEnabled;
        AsyncStorage.setItem(AUDIO_COACH_SETTINGS_KEY, JSON.stringify(stored));
      })
      .catch(() => {});

    // Show toast
    audioCoachToast.show(newEnabled);
  }, [audioCoachSessionEnabled, audioCoachSettings, audioCoachToast]);

  // Persist the EFFECTIVE coach state (settings.enabled overridden by the
  // session toggle) at activity start — the background task reads AsyncStorage,
  // so without this a session-enabled coach stays silent in background.
  const persistEffectiveAudioCoachEnabled = useCallback(() => {
    AsyncStorage.getItem(AUDIO_COACH_SETTINGS_KEY)
      .then((json) => {
        const stored = json ? JSON.parse(json) : { ...audioCoachSettings };
        stored.enabled = isAudioCoachActive;
        return AsyncStorage.setItem(AUDIO_COACH_SETTINGS_KEY, JSON.stringify(stored));
      })
      .catch(() => {});
  }, [audioCoachSettings, isAudioCoachActive]);

  // Undo the session override in AsyncStorage (write back the persisted
  // setting) so a session-only mute/unmute doesn't leak into the next run.
  const restoreAudioCoachSettings = useCallback(() => {
    AsyncStorage.getItem(AUDIO_COACH_SETTINGS_KEY)
      .then((json) => {
        const stored = json ? JSON.parse(json) : { ...audioCoachSettings };
        stored.enabled = audioCoachSettings.enabled;
        return AsyncStorage.setItem(AUDIO_COACH_SETTINGS_KEY, JSON.stringify(stored));
      })
      .catch(() => {});
    setAudioCoachSessionEnabled(null);
    loadAudioCoachSettings();
  }, [audioCoachSettings, loadAudioCoachSettings]);

  const handleToggleLock = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const newLocked = !isScreenLocked;
    setIsScreenLocked(newLocked);
    lockToast.show(newLocked);
  }, [isScreenLocked, lockToast]);

  // DEV-only simulated run for testing the audio coach (see useDevRunSimulator).
  const devSim = useDevRunSimulator();

  const audioCoachDistanceKm =
    __DEV__ && devSim.running ? devSim.distanceKm : currentStats.distance / 1000;
  const audioCoachPace =
    __DEV__ && devSim.running
      ? devSim.pace
      : currentStats.currentPace
        ? currentStats.currentPace / 60
        : 0;

  useAudioCoach({
    settings: { ...audioCoachSettings, enabled: isAudioCoachActive || (__DEV__ && devSim.running) },
    totalDistanceKm: audioCoachDistanceKm,
    currentPaceMinPerKm: audioCoachPace,
    heartRate: currentStats.avg_heart_rate,
    previousKmPace: undefined,
    userTier: tier as any,
  });

  // Preview location for map view (before tracking starts)
  const { previewLocation } = usePreviewLocation(viewMode, isTracking, isPaused, currentPosition);

  // Nearby routes and shadow track
  const {
    nearbyRoutes,
    selectedShadowTrack,
    loadingRoutes,
    routesError,
    handleRouteSelect,
    handleClearShadowTrack,
  } = useNearbyRoutes(selectedSport?.id, currentPosition, previewLocation, viewMode);

  const myPlannedRoutes = useMyPlannedRoutes(isAuthenticated, user);

  // Merged list (my routes first, then nearby) used by both the inline horizontal
  // panel and the full-screen route-selection modal.
  // Dedup by routeKey (source + id): activity ids and planned-route ids come from
  // different tables, so a bare id would hide unrelated nearby routes.
  const mergedRoutesForPanel = useMemo(() => {
    const seen = new Set(myPlannedRoutes.map(routeKey));
    const nearbyDeduped = nearbyRoutes.filter((r) => !seen.has(routeKey(r)));
    return [...myPlannedRoutes, ...nearbyDeduped];
  }, [myPlannedRoutes, nearbyRoutes]);

  const selectedShadowTrackKey = selectedShadowTrack ? routeKey(selectedShadowTrack) : null;

  // Get ordered distance milestones
  const distanceMilestones = useMemo(() => {
    return (
      milestonesData?.distance_single
        ?.filter((m) => MILESTONE_ORDER.includes(m.type))
        ?.sort((a, b) => MILESTONE_ORDER.indexOf(a.type) - MILESTONE_ORDER.indexOf(b.type)) || []
    );
  }, [milestonesData?.distance_single]);

  const status = useMemo<RecordingStatus>(() => {
    if (!activity) return 'idle';
    if (activity.status === 'completed') return 'finished';
    if (isPaused) return 'paused';
    if (isTracking) return 'recording';
    return 'idle';
  }, [activity, isPaused, isTracking]);
  const distance = currentStats.distance;

  // Capture GPS position at the moment recording starts (for approach-path routing).
  // If GPS isn't ready yet at the start moment, retry as soon as currentPosition becomes available.
  const [recordingStartPosition, setRecordingStartPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  useEffect(() => {
    if (
      (status === 'recording' || status === 'paused') &&
      !recordingStartPosition &&
      currentPosition
    ) {
      setRecordingStartPosition({ lat: currentPosition.lat, lng: currentPosition.lng });
    }
    if (status === 'idle' || status === 'finished') {
      if (recordingStartPosition) setRecordingStartPosition(null);
    }
  }, [status, currentPosition, recordingStartPosition]);

  // Map profile from sport (cycling vs walking) for approach routing
  const approachProfile: 'walking' | 'cycling' = useMemo(() => {
    const sport = selectedSport?.name?.toLowerCase() ?? '';
    return sport.includes('bike') || sport.includes('cycl') || sport.includes('rower')
      ? 'cycling'
      : 'walking';
  }, [selectedSport?.name]);

  // Turn-by-turn data for the shadow track: router turns for planned/event routes
  // (fetched from /routes/{id} if the list omitted them), derived from geometry
  // for raw GPS tracks. Feeds NavigationOverlay + voice prompts.
  const shadowTrackTurns = useRouteTurnInstructions(selectedShadowTrack);

  // Re-route from start position to nearest point on shadow track + merge geometries
  const approach = useRouteApproachPath({
    baseGeometry: selectedShadowTrack?.track_data ?? null,
    baseTurnInstructions: shadowTrackTurns,
    routeId: selectedShadowTrackKey,
    startPosition: recordingStartPosition,
    isRecording: status === 'recording',
    profile: approachProfile,
  });

  // Live navigation (Pro feature) - memoized to prevent infinite re-renders in useLiveNavigation
  const plannedRouteForNav = useMemo(() => {
    if (!selectedShadowTrack?.track_data) return null;
    // Wait until the approach hook has a result — otherwise off-route would fire immediately
    // because the raw track starts at a different position than the user.
    if (
      approach.status !== 'ready' &&
      approach.status !== 'snapped' &&
      approach.status !== 'error'
    ) {
      return null;
    }
    const geometry = approach.geometry ?? selectedShadowTrack.track_data;
    const turnInstructions = approach.turnInstructions ?? [];
    const distance = approach.totalDistance || selectedShadowTrack.distance;
    return {
      id: selectedShadowTrack.id,
      user_id: 0,
      title: selectedShadowTrack.title,
      sport_type_id: selectedShadowTrack.sport_type_id,
      profile: approachProfile,
      waypoints: [],
      geometry,
      distance,
      estimated_duration: selectedShadowTrack.duration,
      elevation_gain: selectedShadowTrack.elevation_gain,
      elevation_loss: 0,
      elevation_profile: [],
      turn_instructions: turnInstructions,
      bounds: { min_lat: 0, max_lat: 0, min_lng: 0, max_lng: 0 },
      is_public: false,
      usage_count: 0,
      created_at: selectedShadowTrack.created_at,
      updated_at: selectedShadowTrack.created_at,
    };
  }, [
    selectedShadowTrack?.id,
    selectedShadowTrack?.track_data,
    approach.status,
    approach.geometry,
    approach.turnInstructions,
    approach.totalDistance,
    approachProfile,
  ]);

  const liveNav = useLiveNavigation({
    route: plannedRouteForNav,
    currentPosition,
    currentPace: currentStats.currentPace,
    isRecording: status === 'recording',
  });

  // Voice + haptic announcements for upcoming turns and off-route warnings
  useNavigationAnnouncer({
    nextTurn: liveNav.nextTurn,
    distanceToTurn: liveNav.distanceToTurn,
    shouldAnnounce: liveNav.shouldAnnounce,
    isOffRoute: liveNav.isOffRoute,
    isActive: liveNav.isActive,
  });

  // Accessibility: announce key recording state changes for screen readers
  const prevStatusRef = useRef<RecordingStatus | null>(null);
  useEffect(() => {
    if (prevStatusRef.current === null) {
      prevStatusRef.current = status;
      return;
    }
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;
    if (status === 'recording' || status === 'paused' || status === 'finished') {
      AccessibilityInfo.announceForAccessibility(t(`recording.status.${status}`));
    }
  }, [status, t]);

  // Accessibility: announce GPS signal quality changes during active tracking
  const prevGpsSignalRef = useRef<string | null>(null);
  useEffect(() => {
    const signal = trackingStatus?.gpsSignal;
    if (!signal) return;
    if (prevGpsSignalRef.current === signal) return;
    const wasTracking = prevGpsSignalRef.current !== null;
    prevGpsSignalRef.current = signal;
    if (wasTracking && (status === 'recording' || status === 'paused')) {
      AccessibilityInfo.announceForAccessibility(t(`recording.gpsSignal.${signal}`));
    }
  }, [trackingStatus?.gpsSignal, status, t]);

  // Timer and milestone tracking
  const { localDuration } = useActivityTimer(activity, isTracking, isPaused);
  const { resetMilestones } = useMilestoneTracking(distance, distanceMilestones);
  const { enrichActivityWithHeartRate } = useHealthEnrichment();

  // Handle preselected event
  useEffect(() => {
    const preselectedEvent = route.params?.preselectedEvent;
    if (preselectedEvent && !preselectedEventHandled.current) {
      setSelectedEvent(preselectedEvent);
      const eventSportTypeId = preselectedEvent.sport_type_id ?? preselectedEvent.sport_type?.id;
      if (eventSportTypeId && sportTypes.length > 0 && !sportsLoading) {
        const matchingSport = sportTypes.find((s) => s.id === eventSportTypeId);
        if (matchingSport) {
          setSelectedSport(matchingSport);
          preselectedEventHandled.current = true;

          // Auto-load event route as shadow track
          if (preselectedEvent.route?.geometry) {
            const eventRoute = preselectedEvent.route;
            handleRouteSelect({
              id: eventRoute.id,
              title: eventRoute.title,
              distance: eventRoute.distance,
              elevation_gain: eventRoute.elevation_gain,
              duration: eventRoute.estimated_duration,
              sport_type_id: eventRoute.sport_type_id,
              user: eventRoute.user || { id: 0, name: '', username: '', avatar: '' },
              stats: { likes_count: 0, boosts_count: 0 },
              track_data: eventRoute.geometry,
              distance_from_user: 0,
              created_at: eventRoute.created_at,
              source: 'event',
              turn_instructions: eventRoute.turn_instructions ?? [],
            });
          }
        }
      }
    }
  }, [route.params?.preselectedEvent, sportTypes, sportsLoading, handleRouteSelect]);

  // Error handling
  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error, [{ text: t('common.ok'), onPress: clearError }]);
    }
  }, [error, clearError, t]);

  // Load view preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem('@racefy_recording_view_mode')
      .then((saved) => {
        if (saved === 'map' || saved === 'stats') {
          setViewMode(saved);
        }
      })
      .catch(() => {});
  }, []);

  // Save view preference when changed
  useEffect(() => {
    if (isTracking || isPaused) {
      AsyncStorage.setItem('@racefy_recording_view_mode', viewMode).catch(() => {});
    }
  }, [viewMode, isTracking, isPaused]);

  // Auto-pick a matching ongoing event when entering paused state
  // (only if user hasn't selected one yet and an event with the same sport_type is ongoing)
  useEffect(() => {
    if (status !== 'paused') return;
    if (selectedEvent) return;
    if (!selectedSport) return;
    if (!ongoingEvents.length) return;
    const sportId = selectedSport.id;
    const match = ongoingEvents.find((e) => (e.sport_type_id ?? e.sport_type?.id) === sportId);
    if (match) {
      setSelectedEvent(match);
      logger.info('activity', 'Auto-selected ongoing event matching sport', {
        eventId: match.id,
        sportId,
      });
    }
  }, [status, selectedSport, ongoingEvents, selectedEvent]);

  // Reset routes toggle when leaving idle map view
  useEffect(() => {
    const isIdleMapView = isIdle && viewMode === 'map';

    if (!isIdleMapView && showNearbyRoutesToggle) {
      // Hide routes panel when switching away from idle map view
      setShowNearbyRoutesToggle(false);
    }
  }, [isTracking, isPaused, viewMode, showNearbyRoutesToggle]);

  // Animate toggle buttons position when routes panel visibility changes
  useEffect(() => {
    // Only animate when in idle map view
    const isIdleMapView = isIdle && viewMode === 'map';

    if (isIdleMapView) {
      // When routes panel is visible, move buttons up above it
      // Just enough to clear the panel with spacing.lg margin
      const targetPosition = showNearbyRoutesToggle ? -140 : 0;

      Animated.spring(toggleButtonsPosition, {
        toValue: targetPosition,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Reset to 0 immediately when leaving idle map view
      Animated.timing(toggleButtonsPosition, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isTracking, isPaused, showNearbyRoutesToggle, viewMode, toggleButtonsPosition]);

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
          distance: fmtDistance(activity.distance),
        }),
        [
          {
            text: t(resumeButtonKey),
            onPress: async () => {
              try {
                await requestActivityTrackingPermissions();
                await resumeTracking();
              } catch (err) {
                logger.error('activity', 'Failed to resume from existing activity dialog', {
                  error: err,
                });
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
                logger.error('activity', 'Failed to finish from existing activity dialog', {
                  error: err,
                });
                Alert.alert(t('recording.saveFailedTitle'), t('recording.saveFailed'));
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
                logger.error('activity', 'Failed to discard from existing activity dialog', {
                  error: err,
                });
              }
            },
          },
        ],
        { cancelable: false },
      );
    }
  }, [hasExistingActivity, activity]);

  // One-time (per install) battery-optimization prompt before the first
  // recording on Android — an optimized app risks the OS killing GPS mid-run.
  // Never blocks the start: declining just skips the exemption.
  const maybePromptBatteryExemption = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;
    try {
      const alreadyShown = await AsyncStorage.getItem('@racefy_battery_prompt_shown');
      if (alreadyShown) return;
      if (!(await isBatteryOptimized())) return;

      await AsyncStorage.setItem('@racefy_battery_prompt_shown', '1');

      await new Promise<void>((resolve) => {
        Alert.alert(t('recording.batteryPrompt.title'), t('recording.batteryPrompt.message'), [
          { text: t('recording.batteryPrompt.later'), style: 'cancel', onPress: () => resolve() },
          {
            text: t('recording.batteryPrompt.allow'),
            onPress: async () => {
              await requestIgnoreBatteryOptimizations();
              refreshGpsHealth();
              resolve();
            },
          },
        ]);
      });
    } catch (err) {
      logger.warn('activity', 'Battery exemption prompt failed', { error: err });
    }
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

    await maybePromptBatteryExemption();

    try {
      await startTracking(selectedSport.id, `${selectedSport.name} Activity`, selectedEvent?.id);
      resetMilestones();
      // Keep selectedEvent in state — user may want to change it at save time in PausedView
      logger.activity('Activity started successfully from UI', { sportId: selectedSport.id });

      // Audio coach: announce start + sync the effective session state to
      // AsyncStorage for the background task
      persistEffectiveAudioCoachEnabled();
      announceStart(audioCoachSettings, tier as any);

      // Store milestone thresholds for background audio coach
      if (distanceMilestones.length > 0) {
        const thresholds = distanceMilestones.filter((m) => !m.achieved).map((m) => m.threshold);
        if (thresholds.length > 0) {
          import('../../services/backgroundLocation')
            .then((m) => m.setAudioCoachMilestones(thresholds))
            .catch(() => {});
        }
      }
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
    // Pause first (if still tracking) to stop the timer, then immediately save
    try {
      if (isTracking) {
        await pauseTracking();
      }
      await handleSave();
    } catch (err) {
      logger.error('activity', 'Failed to stop and save activity', { error: err });
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
        event_id: selectedEvent?.id ?? null,
      });

      logger.activity('Activity saved from UI', {
        activityId: result?.activity?.id,
        hasPost: !!result?.post,
      });

      // Audio coach: announce end with summary
      const totalKm = currentStats.distance / 1000;
      const avgPace =
        localDuration > 0 && totalKm > 0
          ? localDuration / 60 / totalKm // min/km
          : 0;
      if (avgPace > 0) {
        announceEnd(audioCoachSettings, totalKm, avgPace, tier as any);
      }

      // Fire-and-forget: enrich activity with HR data from Health Connect / HealthKit
      if (result?.activity) {
        enrichActivityWithHeartRate(result.activity).catch(() => {
          // Silently ignore — enrichment is non-blocking
        });
      }

      resetMilestones();
      setSkipAutoPost(false);

      // Restore original audio coach settings in AsyncStorage (undo session toggle)
      restoreAudioCoachSettings();

      // Inform user about earned points (or lack thereof — activity didn't meet thresholds)
      const pointsEarned = result?.points_earned;
      const successMessage =
        pointsEarned == null || pointsEarned === 0
          ? t('recording.noPointsAwarded')
          : t('recording.pointsAwarded', { points: pointsEarned });

      if (result?.post) {
        if (result.post.status === 'published') {
          Alert.alert(t('common.success'), `${t('recording.activityShared')}\n\n${successMessage}`);
        } else if (result.post.status === 'draft') {
          Alert.alert(
            t('recording.activitySaved'),
            `${t('recording.draftCreated')}\n\n${successMessage}`,
            [
              { text: t('recording.later'), style: 'cancel' },
              {
                text: t('recording.viewDraft'),
                onPress: () => navigation.navigate('PostDetail', { postId: result.post!.id }),
              },
            ],
          );
        }
      } else {
        Alert.alert(t('common.success'), `${t('recording.activitySaved')}\n\n${successMessage}`);
      }
    } catch (err) {
      logger.error('activity', 'Failed to save activity from UI', { error: err });
      Alert.alert(t('recording.saveFailedTitle'), t('recording.saveFailed'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recording.retry'),
          onPress: () => {
            isFinishingRef.current = false;
            handleSave();
          },
        },
      ]);
    } finally {
      isFinishingRef.current = false;
    }
  };

  const handleDiscard = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('recording.discardActivity'), t('recording.discardConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('recording.discard'),
        style: 'destructive',
        onPress: async () => {
          try {
            await discardTracking();
            resetMilestones();
            // Restore original audio coach settings in AsyncStorage
            restoreAudioCoachSettings();
            logger.activity('Activity discarded from UI');
          } catch (err) {
            logger.error('activity', 'Failed to discard activity from UI', { error: err });
          }
        },
      },
    ]);
  };

  // Bottom sheet options
  const handleEventSelect = (event: Event | null) => {
    setSelectedEvent(event);
    if (event) {
      const eventSportTypeId = event.sport_type_id ?? event.sport_type?.id;
      if (eventSportTypeId && sportTypes.length > 0) {
        const matchingSport = sportTypes.find((s) => s.id === eventSportTypeId);
        if (matchingSport) {
          setSelectedSport(matchingSport);
        }
      }
    }
  };

  const addActivityOptions: BottomSheetOption[] = useMemo(
    () => [
      {
        id: 'import',
        icon: 'cloud-upload-outline',
        title: t('recording.addOptions.importGpx'),
        description: t('recording.addOptions.importDescription'),
        onPress: () => navigation.navigate('GpxImport'),
        color: colors.success,
      },
    ],
    [t, colors.success, navigation],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Layout Delegates (IdleView, RecordingView, PausedView are in recording/)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Idle Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderIdleLayout = () => (
    <IdleView
      selectedSport={selectedSport}
      sportTypes={sportTypes}
      sportsLoading={sportsLoading}
      isLoading={isLoading}
      audioCoachActive={isAudioCoachActive}
      onToggleAudioCoach={handleToggleAudioCoach}
      gpsSignal={trackingStatus?.gpsSignal ?? null}
      currentPosition={currentPosition}
      previewLocation={previewLocation}
      mapStyle={mapStyle}
      livePoints={livePoints}
      livePointsVersion={livePointsVersion}
      gpsEnabled={gpsProfile?.enabled ?? false}
      onStart={handleStart}
      onSelectSport={(sport) => setSelectedSport(sport)}
      viewMode={viewMode}
      onToggleView={
        gpsProfile?.enabled
          ? () => {
              const newMode = viewMode === 'stats' ? 'map' : 'stats';
              logger.info('activity', 'Toggling view mode', { from: viewMode, to: newMode });
              setViewMode(newMode);
            }
          : undefined
      }
      devSimRunning={devSim.running}
      onToggleDevSim={() => {
        devSim.toggle();
        triggerHaptic();
      }}
      devSimDistanceKm={devSim.distanceKm}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Recording Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderRecordingLayout = () => (
    <RecordingView
      selectedSport={selectedSport}
      status={status}
      trackingStatus={trackingStatus}
      localDuration={localDuration}
      currentStats={currentStats}
      distance={distance}
      isLoading={isLoading}
      gpsProfile={gpsProfile}
      audioCoachActive={isAudioCoachActive}
      onToggleAudioCoach={handleToggleAudioCoach}
      currentPosition={currentPosition}
      mapStyle={mapStyle}
      livePoints={livePoints}
      livePointsVersion={livePointsVersion}
      followUser={followUser}
      onFollowUserChanged={setFollowUser}
      isLocked={isScreenLocked}
      onToggleLock={handleToggleLock}
      onPause={handlePause}
      onStop={handleStop}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Paused Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPausedLayout = () => (
    <PausedView
      selectedSport={selectedSport}
      status={status}
      trackingStatus={trackingStatus}
      localDuration={localDuration}
      currentStats={currentStats}
      distance={distance}
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      skipAutoPost={skipAutoPost}
      canUseAiPostOnFinish={canUseAiPostOnFinish}
      gpsProfile={gpsProfile}
      livePoints={livePoints}
      livePointsVersion={livePointsVersion}
      currentPosition={currentPosition}
      mapStyle={mapStyle}
      selectedEvent={selectedEvent}
      onShowEventSheet={() => setEventSheetVisible(true)}
      onClearEvent={() => setSelectedEvent(null)}
      onResume={handleResume}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onSkipAutoPostChange={setSkipAutoPost}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Map Top Overlay (idle + map mode) — sport grid + icon toolbar
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMapTopOverlay = () => {
    if (!isIdle) return null;
    const mapStyleIcon =
      mapStyle === 'satellite'
        ? 'globe-outline'
        : mapStyle === 'streets'
          ? 'car-outline'
          : 'trail-sign-outline';

    return (
      <>
        <LinearGradient
          colors={['rgba(0,0,0,0.60)', 'transparent']}
          style={styles.mapTopGradient}
          pointerEvents="none"
        />
        <ScrollView
          style={styles.mapTopOverlay}
          contentContainerStyle={styles.mapTopOverlayContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sport grid – centered wrapping tiles */}
          {sportsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
          ) : (
            <View style={styles.mapSportGrid}>
              {sportTypes.map((sport) => {
                const isSelected = selectedSport?.id === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.mapSportCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                    onPress={() => setSelectedSport(sport)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.mapSportCardIcon,
                        { backgroundColor: isSelected ? colors.primary + '18' : colors.background },
                      ]}
                    >
                      <Ionicons
                        name={sport.icon}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.mapSportCardName,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Icon toolbar – centered */}
          <View style={styles.mapIconToolbar}>
            {/* Audio coach */}
            <TouchableOpacity
              style={[
                styles.mapToolbarIcon,
                { backgroundColor: isAudioCoachActive ? colors.primary : colors.cardBackground },
              ]}
              onPress={handleToggleAudioCoach}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.audioCoach')}
            >
              <Ionicons
                name={isAudioCoachActive ? 'musical-notes' : 'musical-notes-outline'}
                size={24}
                color={isAudioCoachActive ? '#ffffff' : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* View toggle → back to stats */}
            <TouchableOpacity
              style={[styles.mapToolbarIcon, { backgroundColor: colors.primary }]}
              onPress={() => {
                setViewMode('stats');
                triggerHaptic();
              }}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.viewStats')}
            >
              <Ionicons name="list-outline" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Routes toggle */}
            <TouchableOpacity
              style={[
                styles.mapToolbarIcon,
                {
                  backgroundColor: showNearbyRoutesToggle ? colors.primary : colors.cardBackground,
                },
              ]}
              onPress={() => {
                setShowNearbyRoutesToggle((v) => !v);
                triggerHaptic();
              }}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.routes')}
            >
              <Ionicons
                name={showNearbyRoutesToggle ? 'map' : 'map-outline'}
                size={24}
                color={showNearbyRoutesToggle ? '#ffffff' : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Map style */}
            <TouchableOpacity
              style={[styles.mapToolbarIcon, { backgroundColor: colors.cardBackground }]}
              onPress={handleMapStyleToggle}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.mapStyle')}
            >
              <Ionicons name={mapStyleIcon} size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* DEV sim */}
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.mapToolbarIcon,
                  { backgroundColor: devSim.running ? '#ef4444' : colors.cardBackground },
                ]}
                onPress={() => {
                  devSim.toggle();
                  triggerHaptic();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={devSim.running ? 'stop' : 'walk'}
                  size={24}
                  color={devSim.running ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Loading Overlay
  // ═══════════════════════════════════════════════════════════════════════════
  const renderLoadingOverlay = () => {
    if (!isLoading) return null;
    return (
      <View style={[styles.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('common.pleaseWait')}
        </Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <ScreenContainer edges={['top']}>
      {/* Header — idle + recording only (paused has its own header in PausedView) */}
      {(status === 'idle' || status === 'recording') && !isScreenLocked && (
        <View
          style={[
            styles.idleHeader,
            { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.dispatch(TabActions.jumpTo('Home'))}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.idleTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {status === 'recording' && selectedSport ? selectedSport.name : t('recording.title')}
          </Text>
          {(() => {
            const sig = trackingStatus?.gpsSignal ?? null;
            const gpsColor =
              sig === 'good'
                ? colors.success
                : sig === 'weak'
                  ? colors.warning
                  : sig === 'lost'
                    ? colors.error
                    : colors.textMuted;
            const gpsLabel =
              sig === 'good' ? 'READY' : sig === 'weak' ? 'WEAK' : sig === 'lost' ? 'LOST' : 'GPS';
            return (
              <View style={[styles.gpsHeaderBadge, { backgroundColor: gpsColor + '20' }]}>
                <Ionicons name="locate" size={12} color={gpsColor} />
                <Text style={[styles.gpsHeaderText, { color: gpsColor }]}>{gpsLabel}</Text>
              </View>
            );
          })()}
        </View>
      )}

      {/* Live broadcasting: deliberately on the recording screen itself, not in
          settings — the athlete must be able to stop sharing their real-time
          position in one tap while running. */}
      {status === 'recording' && !isScreenLocked && (
        <View
          style={styles.liveBroadcastRow}
          onLayout={(e) => setLiveRowHeight(e.nativeEvent.layout.height)}
        >
          <LiveBroadcastControl
            activityId={activity?.id ?? null}
            onBroadcastingChange={setIsBroadcasting}
          />
          {/* Spectator messages reach the athlete only while broadcasting. */}
          <LiveAthleteInbox
            activityId={activity?.id ?? null}
            isBroadcasting={isBroadcasting}
            ttsIncoming={livePreferences.tts_incoming}
          />
        </View>
      )}

      {/* Main Content Based on Status and View Mode */}
      {viewMode === 'map' ? (
        <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
          <MapboxLiveMap
            livePoints={livePoints}
            livePointsVersion={livePointsVersion}
            currentPosition={currentPosition || previewLocation}
            gpsSignalQuality={trackingStatus?.gpsSignal || 'disabled'}
            followUser={followUser}
            mapStyle={mapStyle}
            nearbyRoutes={isIdle && showNearbyRoutesToggle ? nearbyRoutes : undefined}
            shadowTrack={selectedShadowTrack?.track_data || null}
            selectedRouteKey={selectedShadowTrackKey}
            onRouteSelect={handleRouteSelect}
            onFollowUserChanged={setFollowUser}
            plannedRoute={selectedShadowTrack?.track_data || null}
          />

          {/* Top overlay: sport grid + icon toolbar (idle map mode) */}
          {renderMapTopOverlay()}

          {/* Live Navigation Overlay (Pro only) */}
          {liveNav.isActive && status === 'recording' && (
            <FeatureGate feature="live_navigation">
              <NavigationOverlay navigation={liveNav} />
            </FeatureGate>
          )}

          {/* Nearby routes list (idle state only) */}
          {isIdle && showNearbyRoutesToggle && (
            <NearbyRoutesHorizontalPanel
              routes={mergedRoutesForPanel}
              selectedRouteKey={selectedShadowTrackKey}
              onRouteSelect={handleRouteSelect}
              onClearRoute={handleClearShadowTrack}
              isLoading={loadingRoutes}
              error={routesError}
              bottomOffset={tabBarHeight - spacing.md}
            />
          )}

          {/* Start button (idle state, map view) */}
          {isIdle && (
            <View
              pointerEvents="box-none"
              style={[
                styles.mapStartButtonContainer,
                { bottom: tabBarHeight + spacing.lg + (showNearbyRoutesToggle ? 180 : 0) },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.mapStartButton,
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                ]}
                onPress={handleStart}
                disabled={isLoading || !selectedSport}
                activeOpacity={0.85}
                accessibilityLabel={t('recording.start')}
              >
                <Ionicons name="play" size={36} color="#fff" />
                <Text style={styles.mapStartButtonText}>{t('recording.start')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recording controls (recording/paused state) */}
          {(isTracking || isPaused) && (
            <RecordingMapControls
              duration={localDuration}
              distance={currentStats.distance}
              currentPace={currentStats.currentPace}
              isPaused={isPaused}
              isLoading={isLoading}
              onPause={handlePause}
              onStop={handleStop}
              onResume={handleResume}
              shadowTrackTitle={selectedShadowTrack?.title || null}
              onClearShadowTrack={handleClearShadowTrack}
              onSelectShadowTrack={() => setRouteSelectionModalVisible(true)}
            />
          )}
        </View>
      ) : (
        <>
          {status === 'idle' && (
            <>
              {gpsProfile?.enabled && (
                <GpsHealthCheckCard health={gpsHealth} onRefresh={refreshGpsHealth} />
              )}
              {renderIdleLayout()}
            </>
          )}
          {status === 'recording' && renderRecordingLayout()}
          {status === 'paused' && renderPausedLayout()}
        </>
      )}

      {renderLoadingOverlay()}

      {/* View toggle buttons - visible for GPS-enabled activities only */}
      {/* Animated container to move buttons above routes panel */}
      {gpsProfile?.enabled && (
        <Animated.View
          pointerEvents="box-none"
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 50,
            elevation: 50,
            transform: [{ translateY: toggleButtonsPosition }],
          }}
        >
          {/* Top-right controls row — re-center + view toggle + map style.
              Hidden during paused stats view (no map → buttons would overlap the timer). */}
          {!isIdle && !isScreenLocked && !(status === 'paused' && viewMode === 'stats') && (
            <View
              style={[
                styles.topRightControls,
                // Clear the broadcast row, which sits between the header and the map.
                { top: insets.top + 68 + spacing.sm + liveRowHeight },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.mapStyleToggleButton,
                  { backgroundColor: followUser ? colors.cardBackground : colors.primary },
                ]}
                onPress={() => {
                  setFollowUser(true);
                  triggerHaptic();
                }}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.recenter')}
              >
                <Ionicons
                  name="navigate"
                  size={26}
                  color={followUser ? colors.textSecondary : '#ffffff'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mapStyleToggleButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const newMode = viewMode === 'stats' ? 'map' : 'stats';
                  logger.info('activity', 'Toggling view mode', { from: viewMode, to: newMode });
                  setViewMode(newMode);
                  triggerHaptic();
                }}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.toggleView')}
              >
                <Ionicons
                  name={viewMode === 'stats' ? 'map-outline' : 'list-outline'}
                  size={26}
                  color="#ffffff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mapStyleToggleButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleMapStyleToggle}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.mapStyle')}
              >
                <Ionicons
                  name={
                    mapStyle === 'satellite'
                      ? 'globe-outline'
                      : mapStyle === 'streets'
                        ? 'car-outline'
                        : 'trail-sign-outline'
                  }
                  size={26}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* DEV ONLY: Simulated run — only during recording/paused (idle handled by toolbars) */}
          {__DEV__ && !isIdle && (
            <View style={[styles.devMapToggleContainer, { bottom: fabBottom + 340 }]}>
              <TouchableOpacity
                style={[
                  styles.mapStyleToggleButton,
                  {
                    backgroundColor: devSim.running ? '#ef4444' : colors.cardBackground,
                  },
                ]}
                onPress={() => {
                  devSim.toggle();
                  triggerHaptic();
                }}
                onLongPress={() => {
                  Alert.alert(
                    'Audio Coach Sim',
                    `Distance: ${devSim.distanceKm.toFixed(2)} km\nPace: ${devSim.pace} min/km\nInterval: ${audioCoachSettings.intervalKm} km\nEnabled: ${isAudioCoachActive || devSim.running}\nLanguage: ${audioCoachSettings.language}\nStyle: ${audioCoachSettings.style}\n\n+350m every 10s → 1km every ~29s`,
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={devSim.running ? 'stop' : 'walk'}
                  size={28}
                  color={devSim.running ? '#fff' : colors.textSecondary}
                />
              </TouchableOpacity>
              <Text
                style={{
                  color: devSim.running ? '#ef4444' : colors.textMuted,
                  fontSize: msFont(9),
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {devSim.running ? `${devSim.distanceKm.toFixed(1)}km` : 'SimRun'}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Audio coach toast */}
      {audioCoachToast.visible && (
        <Animated.View
          style={[
            styles.mapStyleToast,
            {
              backgroundColor: audioCoachToast.payload ? colors.primary : colors.cardBackground,
              borderColor: audioCoachToast.payload ? colors.primary : colors.border,
              opacity: audioCoachToast.opacity,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={audioCoachToast.payload ? 'musical-notes' : 'musical-notes-outline'}
            size={20}
            color={audioCoachToast.payload ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.mapStyleToastText,
              { color: audioCoachToast.payload ? '#ffffff' : colors.textPrimary },
            ]}
          >
            {t(
              audioCoachToast.payload
                ? 'recording.audioCoachEnabled'
                : 'recording.audioCoachDisabled',
            )}
          </Text>
        </Animated.View>
      )}

      {/* Lock toast */}
      {lockToast.visible && (
        <Animated.View
          style={[
            styles.mapStyleToast,
            {
              backgroundColor: lockToast.payload ? '#1f2937' : colors.cardBackground,
              borderColor: lockToast.payload ? '#374151' : colors.border,
              opacity: lockToast.opacity,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={lockToast.payload ? 'lock-closed' : 'lock-open-outline'}
            size={20}
            color={lockToast.payload ? '#f9fafb' : colors.textSecondary}
          />
          <Text
            style={[
              styles.mapStyleToastText,
              { color: lockToast.payload ? '#f9fafb' : colors.textPrimary },
            ]}
          >
            {t(lockToast.payload ? 'recording.screenLocked' : 'recording.screenUnlocked')}
          </Text>
        </Animated.View>
      )}

      {/* Map style toast notification */}
      {showStyleToast && viewMode === 'map' && (
        <Animated.View
          style={[
            styles.mapStyleToast,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              opacity: styleToastOpacity,
            },
          ]}
        >
          <Ionicons
            name={
              mapStyle === 'satellite' ? 'globe' : mapStyle === 'streets' ? 'car' : 'trail-sign'
            }
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.mapStyleToastText, { color: colors.textPrimary }]}>
            {mapStyle === 'satellite'
              ? t('recording.mapStyleSatellite')
              : mapStyle === 'streets'
                ? t('recording.mapStyleStreets')
                : t('recording.mapStyleOutdoors')}
          </Text>
        </Animated.View>
      )}

      <SportSelectionModal
        visible={sportModalVisible}
        onClose={() => setSportModalVisible(false)}
        sportTypes={sportTypes}
        selectedSport={selectedSport}
        onSelect={setSelectedSport}
      />

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
        onSelect={handleEventSelect}
        events={ongoingEvents}
        selectedEvent={selectedEvent}
        isLoading={eventsLoading}
      />

      <RouteSelectionModal
        visible={routeSelectionModalVisible}
        onClose={() => setRouteSelectionModalVisible(false)}
        nearbyRoutes={nearbyRoutes}
        myRoutes={myPlannedRoutes}
        selectedRouteKey={selectedShadowTrackKey}
        onRouteSelect={handleRouteSelect}
        onNavigateToLibrary={() => navigation.navigate('RouteLibrary')}
        isLoading={loadingRoutes}
        error={routesError}
      />
    </ScreenContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // ─────────────────────────────────────────────────────────────────────────
  // Idle Header
  // ─────────────────────────────────────────────────────────────────────────
  idleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  idleTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  liveBroadcastRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  gpsHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  // Map View
  // ─────────────────────────────────────────────────────────────────────────
  mapContainer: {
    flex: 1,
  },

  // Start FAB on map view (idle state)
  mapStartButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  mapStartButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },

  // Nearby routes toggle container and button
  routesToggleContainer: {
    position: 'absolute',
    right: spacing.lg,
  },
  routesToggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },

  // Re-center button container and button
  recenterContainer: {
    position: 'absolute',
    right: spacing.lg,
  },
  recenterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Map style toggle container and button
  mapStyleToggleContainer: {
    position: 'absolute',
    right: spacing.lg,
  },
  // DEV: Map component toggle (above re-center button)
  devMapToggleContainer: {
    position: 'absolute',
    right: spacing.lg,
  },
  mapStyleToggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },

  // Map style toast notification
  mapStyleToast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 2000,
  },
  mapStyleToastText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Map Top Overlay (idle + map mode)
  // ─────────────────────────────────────────────────────────────────────────
  mapTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 1,
  },
  mapTopOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    zIndex: 20,
    maxHeight: '55%',
  },
  mapTopOverlayContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  mapSportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapSportCard: {
    width: 76,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapSportCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSportCardName: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  mapIconToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapToolbarIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topRightControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
