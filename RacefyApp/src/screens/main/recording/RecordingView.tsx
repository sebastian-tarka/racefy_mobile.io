import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { GpsPoint } from '../../../types/api';
import type { LiveActivityStats, TrackingStatus } from '../../../hooks/useLiveActivity';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { GpsProfile } from '../../../config/gpsProfiles';
import { calculateAveragePace } from '../../../utils/paceCalculator';
import { formatTime } from '../../../utils/formatters';
import { LivePulse, MapboxLiveMap, NavBanner, StatBlock } from '../../../components';
import type { NavBannerState } from '../../../utils/navigationCues';
import type { MapStyleType } from '../../../components/MapboxLiveMap';
import { WorkoutProgressCard } from './WorkoutProgressCard';
import type { WorkoutPlan } from '../../../types/workout';
import type { SegmentProgress, WorkoutEngineState } from '../../../services/workout/engine';
import { workoutStatusLine } from '../../../utils/workoutFormat';
import { spacing, fontSize, borderRadius, componentSize, heroColors, msFont } from '../../../theme';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

/** How long the stop button must be held before the finish screen opens. */
const HOLD_TO_STOP_MS = 1200;

interface RecordingViewProps {
  selectedSport: SportTypeWithIcon | null;
  status: RecordingStatus;
  trackingStatus: TrackingStatus | null;
  localDuration: number;
  currentStats: LiveActivityStats;
  distance: number;
  isLoading: boolean;
  gpsProfile: GpsProfile | null;
  audioCoachActive?: boolean;
  onToggleAudioCoach?: () => void;
  currentPosition: { lat: number; lng: number } | null;
  mapStyle: MapStyleType;
  livePoints: GpsPoint[];
  livePointsVersion: number;
  followUser: boolean;
  onFollowUserChanged: (following: boolean) => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  /** Tapping the map strip opens the full-screen map view. */
  onExpandMap?: () => void;
  // Turn-by-turn navigation for the chosen route
  /** Null when no route is being followed, or the athlete has no Pro. */
  navigation?: NavBannerState | null;
  navVoiceEnabled?: boolean;
  onToggleNavVoice?: () => void;
  onOpenCueList?: () => void;
  /** A route with directions is loaded, but navigation is a paid feature. */
  navLocked?: boolean;
  onUnlockNav?: () => void;
  // Training goal
  workoutPlan?: WorkoutPlan | null;
  workoutProgress?: SegmentProgress | null;
  workoutState?: WorkoutEngineState | null;
  onOpenWorkout?: () => void;
  onSkipSegment?: () => void;
}

/**
 * The live activity screen (design "Racefy v2" → LiveScreen).
 *
 * A dark instrument panel rather than a map with numbers on top: duration is the
 * hero, the goal HUD sits right under it, four equal readouts follow, and the
 * map is demoted to a strip that proves the track is being recorded. Running and
 * paused are the SAME screen — pausing changes the badge and the middle button,
 * nothing moves — so the athlete never has to re-find a control mid-run.
 */
export function RecordingView({
  selectedSport,
  status,
  trackingStatus,
  localDuration,
  currentStats,
  distance,
  isLoading,
  gpsProfile,
  audioCoachActive,
  onToggleAudioCoach,
  currentPosition,
  mapStyle,
  livePoints,
  livePointsVersion,
  followUser,
  onFollowUserChanged,
  isLocked,
  onToggleLock,
  onPause,
  onResume,
  onStop,
  onExpandMap,
  navigation,
  navVoiceEnabled,
  onToggleNavVoice,
  onOpenCueList,
  navLocked,
  onUnlockNav,
  workoutPlan,
  workoutProgress,
  workoutState,
  onOpenWorkout,
  onSkipSegment,
}: RecordingViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { formatDistance: fmtDistance, formatPaceFromSecPerKm, getPaceUnit } = useUnits();

  const paused = status === 'paused';

  // Hold-to-stop fill — the button fills bottom-up while held.
  const fillAnim = useRef(new Animated.Value(0)).current;
  const fillAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleHoldStart = () => {
    fillAnim.setValue(0);
    fillAnimRef.current = Animated.timing(fillAnim, {
      toValue: 1,
      duration: HOLD_TO_STOP_MS,
      useNativeDriver: false,
    });
    fillAnimRef.current.start();
  };

  const handleHoldEnd = () => {
    fillAnimRef.current?.stop();
    Animated.timing(fillAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const minDistance = gpsProfile?.minDistanceForPace ?? 50;

  const formatAvgPace = (): string => {
    if (currentStats.distance < minDistance) return '--:--';
    return formatPaceFromSecPerKm(
      calculateAveragePace(localDuration, currentStats.distance, minDistance),
    );
  };

  const calories = Math.floor(localDuration * 0.15);
  // The map is proof the track is being recorded, not the thing being read —
  // it gives way to whatever else is on screen (design: 72 / 84 / 120 px).
  const mapHeight = navigation ? 120 : workoutPlan ? 140 : 180;
  // The design's fourth readout is heart rate. Without a paired sensor there is
  // nothing to show, so elevation — which every GPS activity has — takes the
  // tile instead of a permanently empty one.
  const hasHeartRate = (currentStats.avg_heart_rate ?? 0) > 0;

  // One-line goal status for the lock overlay (the athlete glances, not reads).
  const workoutLockLine = workoutPlan
    ? workoutStatusLine(
        workoutPlan,
        workoutProgress ?? null,
        workoutState ?? null,
        fmtDistance,
        t,
      ).toUpperCase()
    : null;

  return (
    <View style={styles.container}>
      {/* ── Top bar: state badge + lock ── */}
      <View style={styles.topBar}>
        <View style={styles.statusBadge}>
          <LivePulse color={paused ? heroColors.amber : heroColors.primary} paused={paused} />
          <Text style={styles.statusText}>
            {paused ? t('recording.status.paused') : t('recording.status.recording')}
          </Text>
        </View>

        <View style={styles.topBarRight}>
          {onToggleAudioCoach !== undefined && (
            <TouchableOpacity
              style={[
                styles.ghostButton,
                audioCoachActive && { backgroundColor: heroColors.primary + '2E' },
              ]}
              onPress={onToggleAudioCoach}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.audioCoach')}
            >
              <Ionicons
                name={audioCoachActive ? 'musical-notes' : 'musical-notes-outline'}
                size={18}
                color={audioCoachActive ? heroColors.primary : heroColors.inkSoft}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={onToggleLock}
            activeOpacity={0.7}
            accessibilityLabel={t('recording.lock')}
          >
            <Ionicons name="lock-open-outline" size={18} color={heroColors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Everything above the controls scrolls; pause and stop never leave the
          screen, however much the goal card and the nav banner take up. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Sport pill ── */}
        {selectedSport && (
          <View style={styles.sportPillRow}>
            <View style={styles.sportPill}>
              <Ionicons name={selectedSport.icon} size={13} color={heroColors.ink} />
              <Text style={styles.sportPillText} numberOfLines={1}>
                {selectedSport.name}
              </Text>
            </View>
            {trackingStatus?.gpsSignal === 'lost' && (
              <View style={[styles.sportPill, { backgroundColor: heroColors.red + '2E' }]}>
                <Ionicons name="warning" size={13} color={heroColors.red} />
                <Text style={[styles.sportPillText, { color: heroColors.red }]}>
                  {t('recording.gpsSignal.lost')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Hero duration ── */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroLabel}>{t('recording.duration').toUpperCase()}</Text>
          <Text style={styles.heroTimer} numberOfLines={1} adjustsFontSizeToFit>
            {formatTime(localDuration)}
          </Text>
        </View>

        {/* ── Next instruction — the thing to read while moving ── */}
        {navigation && (
          <View style={styles.navBlock}>
            <NavBanner
              state={navigation}
              voiceEnabled={navVoiceEnabled}
              onToggleVoice={onToggleNavVoice}
              onOpenCueList={onOpenCueList}
            />
          </View>
        )}

        {navLocked && !navigation && (
          <TouchableOpacity
            style={styles.navLockedRow}
            onPress={onUnlockNav}
            activeOpacity={0.8}
            accessibilityLabel={t('navigation.upsell')}
          >
            <Ionicons name="navigate-outline" size={16} color={heroColors.inkSoft} />
            <Text style={styles.navLockedText} numberOfLines={1}>
              {t('navigation.upsell')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={heroColors.inkSoft} />
          </TouchableOpacity>
        )}

        {/* ── Goal HUD ── */}
        <View style={styles.goalBlock}>
          <WorkoutProgressCard
            plan={workoutPlan ?? null}
            progress={workoutProgress ?? null}
            state={workoutState ?? null}
            variant="live"
            formatDistance={fmtDistance}
            onPress={onOpenWorkout}
            onSkip={onSkipSegment}
          />
        </View>

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          <StatBlock
            style={styles.statCell}
            dark
            size="lg"
            label={t('recording.distance').toUpperCase()}
            value={fmtDistance(distance)}
          />
          <StatBlock
            style={styles.statCell}
            dark
            size="lg"
            label={t('recording.avgPace').toUpperCase()}
            value={formatAvgPace()}
            unit={getPaceUnit()}
          />
          {hasHeartRate ? (
            <StatBlock
              style={styles.statCell}
              dark
              size="lg"
              label={t('recording.heartRate').toUpperCase()}
              value={String(Math.round(currentStats.avg_heart_rate ?? 0))}
              unit={t('recording.bpm')}
            />
          ) : (
            <StatBlock
              style={styles.statCell}
              dark
              size="lg"
              label={t('recording.elevation').toUpperCase()}
              value={String(Math.round(currentStats.elevation_gain ?? 0))}
              unit="m"
            />
          )}
          <StatBlock
            style={styles.statCell}
            dark
            size="lg"
            label={t('recording.calories').toUpperCase()}
            value={String(calories)}
            unit={t('recording.kcal')}
          />
        </View>

        {/* ── Map strip — proof the track is being recorded; tap for the full map ── */}
        {gpsProfile?.enabled !== false && (
          <View style={[styles.mapStrip, { height: mapHeight }]}>
            <MapboxLiveMap
              livePoints={livePoints}
              livePointsVersion={livePointsVersion}
              currentPosition={currentPosition}
              gpsSignalQuality={trackingStatus?.gpsSignal ?? 'disabled'}
              followUser={followUser}
              onFollowUserChanged={onFollowUserChanged}
              mapStyle={mapStyle}
            />
            {onExpandMap && (
              <TouchableOpacity
                style={styles.expandMapButton}
                onPress={onExpandMap}
                activeOpacity={0.8}
                accessibilityLabel={t('recording.toggleView')}
              >
                <Ionicons name="expand-outline" size={16} color={heroColors.ink} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Controls ── */}
      <View style={styles.controlsFooter}>
        <View style={styles.controls}>
          {/* Holding is a guard against a mis-tap mid-run. Once the athlete has
            already paused, that guard costs them a hunt for the save button, so
            paused turns the same control into a labelled one-tap finish. */}
          {paused ? (
            <TouchableOpacity
              style={styles.finishButton}
              onPress={onStop}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityLabel={t('recording.finish.title')}
            >
              <Ionicons name="stop" size={20} color="#ffffff" />
              <Text style={styles.finishText} numberOfLines={1}>
                {t('recording.finish.title')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopButton}
              onLongPress={onStop}
              delayLongPress={HOLD_TO_STOP_MS}
              onPressIn={handleHoldStart}
              onPressOut={handleHoldEnd}
              disabled={isLoading}
              activeOpacity={1}
              accessibilityLabel={t('recording.holdToFinish')}
            >
              <Animated.View
                style={[
                  styles.stopFill,
                  {
                    height: fillAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, CONTROL_SECONDARY],
                    }),
                  },
                ]}
              />
              <Ionicons name="stop" size={22} color="#ffffff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: paused ? heroColors.primary : heroColors.amber,
                shadowColor: paused ? heroColors.primary : heroColors.amber,
              },
            ]}
            onPress={paused ? onResume : onPause}
            disabled={isLoading}
            activeOpacity={0.85}
            accessibilityLabel={paused ? t('recording.resume') : t('recording.pause')}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={30} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.goalButton}
            onPress={onOpenWorkout}
            disabled={!onOpenWorkout}
            activeOpacity={0.7}
            accessibilityLabel={t('recording.workout.openConfig')}
          >
            <Ionicons name="flag-outline" size={22} color={heroColors.ink} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.holdHint, { paddingBottom: insets.bottom + spacing.md }]}>
          {paused ? t('recording.pausedHint') : t('recording.holdToFinish')}
        </Text>
      </View>

      {/* ── Lock overlay ── */}
      {isLocked && (
        <TouchableOpacity
          style={styles.lockedOverlay}
          onLongPress={onToggleLock}
          delayLongPress={1500}
          activeOpacity={1}
          accessibilityLabel={t('recording.holdToUnlock')}
        >
          <Text style={styles.lockedTimer}>{formatTime(localDuration)}</Text>
          {workoutLockLine && (
            <View style={styles.lockedWorkoutRow}>
              <Ionicons name="flag" size={14} color={heroColors.inkSoft} />
              <Text style={styles.lockedWorkoutText} numberOfLines={1}>
                {workoutLockLine}
              </Text>
            </View>
          )}
          <Ionicons
            name="lock-closed"
            size={52}
            color={colors.white}
            style={{ marginTop: spacing.lg, opacity: 0.9 }}
          />
          <View style={styles.lockedHintRow}>
            <Ionicons name="hand-left-outline" size={16} color={heroColors.inkSoft} />
            <Text style={styles.lockedHint}>{t('recording.holdToUnlock')}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const CONTROL_PRIMARY = 84;
const CONTROL_SECONDARY = 64;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: heroColors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: msFont(11),
    fontWeight: '700',
    letterSpacing: 2,
    color: heroColors.ink,
    opacity: 0.85,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghostButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heroColors.surfaceStrong,
    borderWidth: 1,
    borderColor: heroColors.line,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  sportPillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  navBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  navLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: heroColors.line,
  },
  navLockedText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: heroColors.inkSoft,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: heroColors.surfaceStrong,
  },
  sportPillText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: heroColors.ink,
  },
  heroBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heroLabel: {
    fontSize: msFont(11),
    fontWeight: '600',
    letterSpacing: 2,
    color: heroColors.inkSoft,
  },
  heroTimer: {
    fontSize: componentSize.heroTimerFont * 0.9,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    color: heroColors.ink,
    marginTop: 2,
  },
  goalBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    rowGap: spacing.md,
  },
  statCell: {
    width: '50%',
  },
  expandMapButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,26,20,0.72)',
  },
  mapStrip: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: heroColors.line,
  },
  controlsFooter: {
    borderTopWidth: 1,
    borderTopColor: heroColors.line,
    backgroundColor: heroColors.bg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.lg,
  },
  stopButton: {
    width: CONTROL_SECONDARY,
    height: CONTROL_SECONDARY,
    borderRadius: CONTROL_SECONDARY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heroColors.red,
    overflow: 'hidden',
  },
  finishButton: {
    height: CONTROL_SECONDARY,
    paddingHorizontal: spacing.lg,
    borderRadius: CONTROL_SECONDARY / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: heroColors.red,
  },
  finishText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  stopFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    opacity: 0.35,
  },
  primaryButton: {
    width: CONTROL_PRIMARY,
    height: CONTROL_PRIMARY,
    borderRadius: CONTROL_PRIMARY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  goalButton: {
    width: CONTROL_SECONDARY,
    height: CONTROL_SECONDARY,
    borderRadius: CONTROL_SECONDARY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: heroColors.surfaceStrong,
    borderWidth: 1,
    borderColor: heroColors.line,
  },
  holdHint: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: heroColors.inkFaint,
    paddingTop: spacing.sm,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,26,20,0.94)',
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  lockedTimer: {
    fontSize: componentSize.heroTimerFont * 0.72,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    color: heroColors.ink,
  },
  lockedWorkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  lockedWorkoutText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    color: heroColors.inkSoft,
  },
  lockedHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  lockedHint: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: heroColors.inkSoft,
  },
});
