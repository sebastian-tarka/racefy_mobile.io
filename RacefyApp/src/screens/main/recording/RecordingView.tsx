import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { logger } from '../../../services/logger';
import { MapboxLiveMap } from '../../../components';
import type { MapStyleType } from '../../../components/MapboxLiveMap';
import { spacing, fontSize, borderRadius, componentSize } from '../../../theme';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

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
  onStop: () => void;
}

export function RecordingView({
  selectedSport,
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
  onStop,
}: RecordingViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { formatDistance: fmtDistance, formatPaceFromSecPerKm, getPaceUnit } = useUnits();

  // Hold-to-finish fill animation
  const fillAnim = useRef(new Animated.Value(0)).current;
  const fillAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [btnWidth, setBtnWidth] = useState(0);

  const handleHoldStart = () => {
    fillAnim.setValue(0);
    fillAnimRef.current = Animated.timing(fillAnim, {
      toValue: btnWidth,
      duration: 1500,
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
    const avgPace = calculateAveragePace(localDuration, currentStats.distance, minDistance);
    if (Math.floor(currentStats.distance / 5000) !== Math.floor((currentStats.distance - 50) / 5000)) {
      logger.debug('activity', 'formatAvgPace debug', {
        localDuration,
        distance: Math.round(currentStats.distance),
        avgPaceRaw: avgPace,
        formatted: formatPaceFromSecPerKm(avgPace),
      });
    }
    return formatPaceFromSecPerKm(avgPace);
  };

  const calories = Math.floor(localDuration * 0.15);

  return (
    <View style={styles.container}>
      {/* Map background */}
      <MapboxLiveMap
        livePoints={livePoints}
        livePointsVersion={livePointsVersion}
        currentPosition={currentPosition}
        gpsSignalQuality={trackingStatus?.gpsSignal ?? 'disabled'}
        followUser={followUser}
        onFollowUserChanged={onFollowUserChanged}
        mapStyle={mapStyle}
      />

      {/* White gradient — top */}
      <LinearGradient
        colors={['rgba(255,255,255,0.82)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* White gradient — bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.88)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Two-half overlay — zIndex above gradients */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">

        {/* ── TOP HALF: timer + stats, centered ── */}
        <View style={styles.topHalf}>
          <Text style={styles.durationLabel}>
            {t('recording.duration', 'DURATION').toUpperCase()}
          </Text>
          <Text style={styles.heroTimer}>
            {formatTime(localDuration)}
          </Text>

          <View style={styles.metricCards}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                {t('recording.distance', 'DISTANCE').toUpperCase()}
              </Text>
              <Text style={styles.metricValue}>
                {fmtDistance(distance)}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                {t('recording.avgPace', 'AVG PACE').toUpperCase()}
              </Text>
              <Text style={styles.metricValue}>
                {formatAvgPace()}
                <Text style={styles.metricUnit}> {getPaceUnit()}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.caloriesRow}>
            <Ionicons name="flame" size={18} color={colors.warning} />
            <Text style={styles.caloriesValue}>{calories}</Text>
            <Text style={styles.caloriesLabel}>{t('recording.calories', 'kcal')}</Text>
          </View>
        </View>

        {/* ── BOTTOM HALF: controls ── */}
        <View style={[styles.bottomHalf, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.toolbar}>
            {/* Audio coach */}
            <TouchableOpacity
              style={[styles.toolbarButton, { backgroundColor: audioCoachActive ? colors.primary + '22' : 'rgba(0,0,0,0.08)' }]}
              onPress={onToggleAudioCoach}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.audioCoach')}
            >
              <Ionicons
                name={audioCoachActive ? 'musical-notes' : 'musical-notes-outline'}
                size={22}
                color={audioCoachActive ? colors.primary : 'rgba(0,0,0,0.45)'}
              />
            </TouchableOpacity>

            {/* Pause */}
            <TouchableOpacity
              style={[styles.pauseButton, { backgroundColor: colors.primary }]}
              onPress={onPause}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityLabel={t('recording.pause')}
            >
              <Ionicons name="pause" size={32} color="#ffffff" />
            </TouchableOpacity>

            {/* Lock */}
            <TouchableOpacity
              style={[styles.toolbarButton, { backgroundColor: isLocked ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.08)' }]}
              onPress={onToggleLock}
              activeOpacity={0.7}
              accessibilityLabel={t('recording.lock')}
            >
              <Ionicons
                name={isLocked ? 'lock-closed' : 'lock-closed-outline'}
                size={22}
                color={isLocked ? '#ef4444' : 'rgba(0,0,0,0.35)'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.holdToFinishButton}
            onLongPress={onStop}
            delayLongPress={1500}
            onPressIn={handleHoldStart}
            onPressOut={handleHoldEnd}
            disabled={isLoading}
            activeOpacity={1}
            onLayout={(e) => setBtnWidth(e.nativeEvent.layout.width)}
            accessibilityLabel={t('recording.holdToFinish', 'Hold to finish activity')}
          >
            <Animated.View style={[styles.holdToFinishFill, { width: fillAnim }]} />
            <Ionicons name="stop-circle-outline" size={16} color="rgba(0,0,0,0.45)" />
            <Text style={styles.holdToFinishText}>
              {t('recording.holdToFinish', 'HOLD TO FINISH ACTIVITY').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

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
          <Ionicons name="lock-closed" size={52} color="rgba(255,255,255,0.9)" style={{ marginTop: spacing.lg }} />
          <View style={styles.lockedHintRow}>
            <Ionicons name="hand-left-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.lockedHint}>
              {t('recording.holdToUnlock', 'HOLD TO UNLOCK').toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  overlay: {
    flexDirection: 'column',
    zIndex: 5,
  },
  topHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bottomHalf: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  durationLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#666666',
  },
  heroTimer: {
    fontSize: componentSize.heroTimerFont * 0.72,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    color: '#111111',
  },
  metricCards: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    color: '#888888',
  },
  metricValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111111',
  },
  metricUnit: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  caloriesValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#333333',
  },
  caloriesLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#666666',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  toolbarButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  holdToFinishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  holdToFinishFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderRadius: borderRadius.full,
  },
  holdToFinishText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(0,0,0,0.45)',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
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
    color: '#ffffff',
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
    color: 'rgba(255,255,255,0.6)',
  },
});