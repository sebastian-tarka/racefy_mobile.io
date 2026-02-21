import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  usePreviewLocation, useNearbyRoutes, useLiveActivityContext, usePermissions,
  useActivityStats, useOngoingEvents, useMilestones, useHealthEnrichment,
  useSportTypes, type SportTypeWithIcon, useTheme, useUnits, useAuth,
  triggerHaptic, useActivityTimer, useMilestoneTracking,
} from '../../hooks';
import {
  BottomSheet, EventSelectionSheet, type BottomSheetOption, RecordingMapControls,
  ViewToggleButton, NearbyRoutesList, NearbyRoutesHorizontalPanel, ScreenContainer,
  MapboxLiveMap,
} from '../../components';
import { IdleView } from './recording/IdleView';
import { RecordingView } from './recording/RecordingView';
import { PausedView } from './recording/PausedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Event, TrainingWeek } from '../../types/api';
import * as Haptics from 'expo-haptics';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { RootStackParamList, MainTabParamList } from '../../navigation';
import { logger } from '../../services/logger';
import { api } from '../../services/api';
import { formatTime } from '../../utils/formatters';

// Conditional import - only loads if @rnmapbox/maps is installed
// eslint-disable-next-line @typescript-eslint/no-var-requires
let MapboxGL: any = null;
try {
  MapboxGL = require('@rnmapbox/maps').default;
} catch {
  // Mapbox not available
}

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
  const { formatDistance: fmtDistance } = useUnits();
  const { isAuthenticated } = useAuth();
  const { requestActivityTrackingPermissions } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Record'>>();

  // Bottom sheets & modals
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [eventSheetVisible, setEventSheetVisible] = useState(false);
  const [routeSelectionModalVisible, setRouteSelectionModalVisible] = useState(false);

  // Activity options
  const [selectedSport, setSelectedSport] = useState<SportTypeWithIcon | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [skipAutoPost, setSkipAutoPost] = useState(false);
  const preselectedEventHandled = useRef(false);
  const isFinishingRef = useRef(false);

  // View mode state (stats vs map)
  const [viewMode, setViewMode] = useState<'stats' | 'map'>('stats');

  // Nearby routes visibility toggle (default hidden)
  const [showNearbyRoutesToggle, setShowNearbyRoutesToggle] = useState(false);

  // Toggle between inline map and MapboxLiveMap component
  // Production/staging always uses LiveMap; dev mode allows switching for comparison
  const [useLiveMapComponent, setUseLiveMapComponent] = useState(true);

  // Map style selection
  type MapStyleType = 'outdoors' | 'streets' | 'satellite';
  const [mapStyle, setMapStyle] = useState<MapStyleType>('outdoors');
  const [showStyleToast, setShowStyleToast] = useState(false);
  const styleToastOpacity = useRef(new Animated.Value(0)).current;

  // Animation for toggle buttons position
  const toggleButtonsPosition = useRef(new Animated.Value(0)).current;

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

  const isIdle = !isTracking && !isPaused;

  // Preview location for map view (before tracking starts)
  const { previewLocation, fetchingPreviewLocation } = usePreviewLocation(viewMode, isTracking, isPaused, currentPosition);

  // Nearby routes and shadow track
  const {
    nearbyRoutes, selectedShadowTrack, loadingRoutes, routesError,
    handleRouteSelect, handleClearShadowTrack,
  } = useNearbyRoutes(selectedSport?.id, currentPosition, previewLocation, viewMode);

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
  const { passedMilestones, resetMilestones } = useMilestoneTracking(distance, distanceMilestones);
  const { enrichActivityWithHeartRate } = useHealthEnrichment();

  // Find next milestone
  const nextMilestone = useMemo(() => {
    return distanceMilestones.find(m => !m.achieved && !passedMilestones.includes(m.threshold));
  }, [distanceMilestones, passedMilestones]);

  // Set default sport from user preferences or fallback to first sport
  useEffect(() => {
    const setDefaultSport = async () => {
      if (sportTypes.length > 0 && !selectedSport && !sportsLoading) {
        try {
          // Try to get favorite sport from user preferences if authenticated
          if (isAuthenticated) {
            const preferences = await api.getPreferences();
            const favoriteSportId = preferences.activity_defaults.favorite_sport_id;

            if (favoriteSportId) {
              const favoriteSport = sportTypes.find(s => s.id === favoriteSportId);
              if (favoriteSport) {
                setSelectedSport(favoriteSport);
                return;
              }
            }
          }
        } catch (error) {
          logger.debug('activity', 'Failed to load favorite sport preference, using fallback', { error });
        }

        // Fallback to first sport if no favorite or not authenticated
        setSelectedSport(sportTypes[0]);
      }
    };

    setDefaultSport();
  }, [sportTypes, selectedSport, sportsLoading, isAuthenticated]);

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
      } catch (err: unknown) {
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

  // Show toast when map style changes
  useEffect(() => {
    if (viewMode === 'map') {
      setShowStyleToast(true);

      // Fade in
      Animated.timing(styleToastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        Animated.timing(styleToastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowStyleToast(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [mapStyle, viewMode, styleToastOpacity]);

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

      // Fire-and-forget: enrich activity with HR data from Health Connect / HealthKit
      if (result?.activity) {
        enrichActivityWithHeartRate(result.activity).catch(() => {
          // Silently ignore — enrichment is non-blocking
        });
      }

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

  const handleMapStyleToggle = () => {
    const styles: MapStyleType[] = ['outdoors', 'streets', 'satellite'];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    const nextStyle = styles[nextIndex];

    setMapStyle(nextStyle);
    triggerHaptic();
    logger.info('activity', 'Map style changed', { from: mapStyle, to: nextStyle });
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

  // Pan gesture for modal drag-to-close
  const modalDragGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only respond to downward drags
      if (event.translationY > 0) {
        // Could add visual feedback here (translate modal down)
      }
    })
    .onEnd((event) => {
      // Close modal if dragged down more than 100px with reasonable velocity
      if (event.translationY > 100 || event.velocityY > 500) {
        setRouteSelectionModalVisible(false);
      }
    });

  // Bottom sheet options
  const addActivityOptions: BottomSheetOption[] = useMemo(() => [
    {
      id: 'import',
      icon: 'cloud-upload-outline',
      title: t('recording.addOptions.importGpx'),
      description: t('recording.addOptions.importDescription'),
      onPress: () => navigation.navigate('GpxImport'),
      color: colors.success,
    },
  ], [t, colors.success, navigation]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Layout Delegates (IdleView, RecordingView, PausedView are in recording/)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Map View (Idle, Recording, or Paused)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMapView = () => {
    // Show controls only during recording/paused (not in idle preview)
    const showControls = isTracking || isPaused;
    // Show nearby routes in idle state AND if toggle is enabled
    const showNearbyRoutes = isIdle && showNearbyRoutesToggle;

    // Use tracking position if available, otherwise use preview location
    const displayPosition = currentPosition || previewLocation;

    try {
      // Don't render map until we have a position (avoids zoom effect)
      if (!displayPosition) {
        return (
          <View style={[styles.mapFallbackContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.mapFallbackText, { color: colors.textMuted }]}>
              {fetchingPreviewLocation ? t('recording.fetchingLocation') : t('recording.waitingForGPS')}
            </Text>
          </View>
        );
      }

      if (!MapboxGL) {
        return (
          <View style={[styles.mapFallbackContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="map-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.mapFallbackText, { color: colors.textMuted }]}>
              {t('recording.mapError')}
            </Text>
          </View>
        );
      }

      // Create stable key for map view to prevent layer conflicts
      // Include mapStyle so map re-renders when style changes
      const mapKey = `map-${showControls ? 'recording' : 'idle'}-${isDark ? 'dark' : 'light'}-${mapStyle}`;

      return (
        <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
          {/* Map - already centered on cached position (no animation) */}
          <MapboxGL.MapView
            key={mapKey}
            style={{ flex: 1 }}
            styleURL={
              mapStyle === 'satellite'
                ? MapboxGL.StyleURL.Satellite
                : mapStyle === 'streets'
                ? isDark
                  ? 'mapbox://styles/mapbox/navigation-night-v1'
                  : MapboxGL.StyleURL.Street
                : isDark
                ? 'mapbox://styles/mapbox/dark-v11'
                : MapboxGL.StyleURL.Outdoors
            }
            logoEnabled={false}
            attributionEnabled={false}
          >
            <MapboxGL.Camera
              defaultSettings={{
                centerCoordinate: [displayPosition.lng, displayPosition.lat],
                zoomLevel: 15,
              }}
              animationMode="none"
            />

            {/* Shadow track (when recording/paused and track is selected) */}
            {showControls && selectedShadowTrack && selectedShadowTrack.track_data && (
              <MapboxGL.ShapeSource
                id="shadow-track"
                shape={{
                  type: 'Feature',
                  properties: {},
                  geometry: selectedShadowTrack.track_data,
                }}
              >
                {/* Border/outline layer for shadow track */}
                <MapboxGL.LineLayer
                  id="shadow-border"
                  style={{
                    lineColor: isDark ? '#1E3A8A' : '#1E40AF',
                    lineWidth: 8,
                    lineOpacity: 0.4,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                {/* Main shadow track line */}
                <MapboxGL.LineLayer
                  id="shadow-line"
                  style={{
                    lineColor: isDark ? '#60A5FA' : '#3B82F6',
                    lineWidth: 5,
                    lineOpacity: 0.7,
                    lineDasharray: [3, 2],
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* Live tracking route (when recording/paused) */}
            {showControls && livePoints.length > 0 && (
              <MapboxGL.ShapeSource
                id="live-route"
                shape={{
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: livePoints.map(p => [p.lng, p.lat]),
                  },
                }}
              >
                <MapboxGL.LineLayer
                  id="live-route-line"
                  style={{
                    lineColor: colors.primary,
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round',
                    lineOpacity: 1,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* All nearby routes as gray base layer (idle state only) */}
            {showNearbyRoutes && nearbyRoutes
              .filter(route => {
                // Validate route has proper track_data structure
                return route.track_data &&
                       route.track_data.type === 'LineString' &&
                       route.track_data.coordinates &&
                       Array.isArray(route.track_data.coordinates) &&
                       route.track_data.coordinates.length > 0;
              })
              .map((route) => {
                const unselectedColor = isDark ? '#9CA3AF' : '#6B7280'; // Gray for all routes

                return (
                  <MapboxGL.ShapeSource
                    key={`nearby-base-${route.id}`}
                    id={`nearby-base-source-${route.id}`}
                    shape={{
                      type: 'Feature',
                      properties: {},
                      geometry: route.track_data,
                    }}
                  >
                    <MapboxGL.LineLayer
                      id={`nearby-base-line-${route.id}`}
                      style={{
                        lineColor: unselectedColor,
                        lineWidth: 2.5,
                        lineOpacity: 0.6,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </MapboxGL.ShapeSource>
                );
              })}

            {/* Selected route overlay (blue with border) - rendered on top */}
            {showNearbyRoutes && selectedShadowTrack && selectedShadowTrack.track_data && (
              <MapboxGL.ShapeSource
                id="selected-route-overlay"
                shape={{
                  type: 'Feature',
                  properties: {},
                  geometry: selectedShadowTrack.track_data,
                }}
              >
                {/* Border layer */}
                <MapboxGL.LineLayer
                  id="selected-route-border"
                  style={{
                    lineColor: isDark ? '#1E3A8A' : '#1E40AF',
                    lineWidth: 8,
                    lineOpacity: 0.6,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                {/* Main line layer */}
                <MapboxGL.LineLayer
                  id="selected-route-line"
                  style={{
                    lineColor: isDark ? '#60A5FA' : '#3B82F6',
                    lineWidth: 5,
                    lineOpacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* User position marker */}
            <MapboxGL.PointAnnotation
              id="currentPosition"
              coordinate={[displayPosition.lng, displayPosition.lat]}
            >
              <View style={styles.mapMarker}>
                <View style={[styles.mapMarkerInner, { backgroundColor: colors.primary }]} />
              </View>
            </MapboxGL.PointAnnotation>
          </MapboxGL.MapView>

          {/* Nearby routes list (idle state only) */}
          {showNearbyRoutes && (
            <NearbyRoutesHorizontalPanel
              routes={nearbyRoutes}
              selectedRouteId={selectedShadowTrack?.id ?? null}
              onRouteSelect={handleRouteSelect}
              onClearRoute={handleClearShadowTrack}
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
            onSelectShadowTrack={() => setRouteSelectionModalVisible(true)}
          />
        )}
        </View>
      );
    } catch (error: unknown) {
      logger.error('activity', 'Map view render error', { error: error instanceof Error ? error.message : String(error) });
      // Fallback to stats view if map fails
      return (
        <View style={[styles.mapFallbackContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={[styles.mapErrorText, { color: colors.error }]}>
            {t('recording.mapError')}
          </Text>
          <Text style={[styles.mapErrorDetail, { color: colors.textMuted }]}>
            {error instanceof Error ? error.message : String(error)}
          </Text>
          <TouchableOpacity
            style={[styles.mapErrorButton, { backgroundColor: colors.primary }]}
            onPress={() => setViewMode('stats')}
          >
            <Text style={{ color: '#fff' }}>{t('recording.backToStats')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Idle Layout
  // ═══════════════════════════════════════════════════════════════════════════
  const renderIdleLayout = () => (
    <IdleView
      selectedSport={selectedSport}
      sportsLoading={sportsLoading}
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      pulseAnim={pulseAnim}
      selectedEvent={selectedEvent}
      activeWeek={activeWeek}
      activityStats={activityStats}
      statsLoading={statsLoading}
      milestonesLoading={milestonesLoading}
      nextMilestone={nextMilestone}
      onStart={handleStart}
      onOpenSportModal={() => setSportModalVisible(true)}
      onOpenEventSheet={() => setEventSheetVisible(true)}
      onClearEvent={() => setSelectedEvent(null)}
      onRefreshEvents={refreshEvents}
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
      isAuthenticated={isAuthenticated}
      nextMilestone={nextMilestone}
      gpsProfile={gpsProfile}
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
      gpsProfile={gpsProfile}
      onResume={handleResume}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onSkipAutoPostChange={setSkipAutoPost}
    />
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
    <ScreenContainer>
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
        useLiveMapComponent ? (
          <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
            <MapboxLiveMap
              livePoints={livePoints}
              currentPosition={currentPosition || previewLocation}
              gpsSignalQuality={trackingStatus?.gpsSignal || 'disabled'}
              followUser={true}
              mapStyle={mapStyle}
              nearbyRoutes={isIdle && showNearbyRoutesToggle ? nearbyRoutes : undefined}
              shadowTrack={selectedShadowTrack?.track_data || null}
              selectedRouteId={selectedShadowTrack?.id || null}
              onRouteSelect={handleRouteSelect}
            />

            {/* Nearby routes list (idle state only) */}
            {isIdle && showNearbyRoutesToggle && (
              <NearbyRoutesHorizontalPanel
                routes={nearbyRoutes}
                selectedRouteId={selectedShadowTrack?.id ?? null}
                onRouteSelect={handleRouteSelect}
                onClearRoute={handleClearShadowTrack}
                isLoading={loadingRoutes}
                error={routesError}
              />
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
          renderMapView()
        )
      ) : (
        <>
          {status === 'idle' && renderIdleLayout()}
          {status === 'recording' && renderRecordingLayout()}
          {status === 'paused' && renderPausedLayout()}
        </>
      )}

      {renderLoadingOverlay()}

      {/* View toggle buttons - visible for GPS-enabled activities only */}
      {/* Animated container to move buttons above routes panel */}
      {gpsProfile?.enabled && (
        <Animated.View
          style={{
            transform: [{ translateY: toggleButtonsPosition }],
          }}
        >
          <ViewToggleButton
            currentView={viewMode}
            onToggle={() => {
              const newMode = viewMode === 'stats' ? 'map' : 'stats';
              logger.info('activity', 'Toggling view mode', { from: viewMode, to: newMode });
              setViewMode(newMode);
            }}
          />

          {/* Nearby routes toggle - only visible in idle state and map view */}
          {isIdle && viewMode === 'map' && (
            <View style={styles.routesToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.routesToggleButton,
                  {
                    backgroundColor: showNearbyRoutesToggle ? colors.primary : colors.cardBackground,
                  },
                ]}
                onPress={() => {
                  const newValue = !showNearbyRoutesToggle;
                  logger.info('activity', 'Toggling nearby routes', { show: newValue });
                  setShowNearbyRoutesToggle(newValue);
                  triggerHaptic();
                }}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.routes')}
              >
                <Ionicons
                  name={showNearbyRoutesToggle ? 'map' : 'map-outline'}
                  size={28}
                  color={showNearbyRoutesToggle ? '#fff' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Map style toggle - only visible in map view */}
          {viewMode === 'map' && (
            <View style={styles.mapStyleToggleContainer}>
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
                  size={28}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* DEV ONLY: Toggle between inline map and MapboxLiveMap component */}
          {__DEV__ && viewMode === 'map' && (
            <View style={styles.devMapToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.mapStyleToggleButton,
                  {
                    backgroundColor: useLiveMapComponent ? colors.primary : colors.cardBackground,
                  },
                ]}
                onPress={() => {
                  setUseLiveMapComponent(prev => !prev);
                  triggerHaptic();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={useLiveMapComponent ? 'layers' : 'layers-outline'}
                  size={28}
                  color={useLiveMapComponent ? '#fff' : colors.textSecondary}
                />
              </TouchableOpacity>
              <Text style={{ color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                {useLiveMapComponent ? 'LiveMap' : 'Inline'}
              </Text>
            </View>
          )}
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
              mapStyle === 'satellite'
                ? 'globe'
                : mapStyle === 'streets'
                ? 'car'
                : 'trail-sign'
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

      {/* Sport Selection Modal */}
      <Modal
        visible={sportModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSportModalVisible(false)}
      >
        <ScreenContainer style={styles.modalContainer}>
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
        </ScreenContainer>
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

      {/* Route Selection Modal */}
      <Modal
        visible={routeSelectionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRouteSelectionModalVisible(false)}
        transparent={false}
      >
        <ScreenContainer>
          {/* Drag handle bar (Android/iOS) - swipe down to close */}
          <GestureDetector gesture={modalDragGesture}>
            <TouchableOpacity
              style={[styles.modalDragHandle, { backgroundColor: colors.cardBackground }]}
              onPress={() => setRouteSelectionModalVisible(false)}
              activeOpacity={0.8}
            >
              <View style={[styles.modalDragIndicator, { backgroundColor: colors.border }]} />
            </TouchableOpacity>
          </GestureDetector>

          {/* Header with close button */}
          <View style={[styles.modalHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('recording.selectShadowTrack')}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setRouteSelectionModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Routes list */}
          <NearbyRoutesList
            routes={nearbyRoutes}
            selectedRouteId={selectedShadowTrack?.id || null}
            onRouteSelect={(route) => {
              handleRouteSelect(route);
              setRouteSelectionModalVisible(false);
            }}
            isLoading={loadingRoutes}
            error={routesError}
          />

          {/* Cancel button at bottom (optional, for better UX) */}
          <View style={[styles.modalFooter, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.background }]}
              onPress={() => setRouteSelectionModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelButtonText, { color: colors.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
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
  modalDragHandle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
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
  // Map View
  // ─────────────────────────────────────────────────────────────────────────
  mapFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  mapFallbackText: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
  },
  mapContainer: {
    flex: 1,
  },
  mapErrorText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  mapErrorDetail: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 12,
  },
  mapErrorButton: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  mapMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  mapMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Nearby routes toggle container and button (matching ViewToggleButton style)
  routesToggleContainer: {
    position: 'absolute',
    bottom: spacing.xxl + 70, // Position above ViewToggleButton
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

  // Map style toggle container and button
  mapStyleToggleContainer: {
    position: 'absolute',
    bottom: spacing.xxl + 140, // Position above routes toggle
    right: spacing.lg,
  },
  // DEV: Map component toggle (above map style toggle)
  devMapToggleContainer: {
    position: 'absolute',
    bottom: spacing.xxl + 210, // Position above map style toggle
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
});