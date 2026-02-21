import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { LiveActivityStats, TrackingStatus } from '../../../hooks/useLiveActivity';
import type { MilestoneSingle } from '../../../types/api';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { GpsProfile } from '../../../config/gpsProfiles';
import { calculateAveragePace } from '../../../utils/paceCalculator';
import { formatTime } from '../../../utils/formatters';
import { spacing, fontSize, borderRadius } from '../../../theme';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

// Milestone key-to-km mapping (shared with parent)
const MILESTONE_KM: Record<string, string> = {
  first_5km: '5',
  first_10km: '10',
  first_15km: '15',
  first_half_marathon: '21.1',
  first_30km: '30',
  first_marathon: '42.2',
};

interface RecordingViewProps {
  selectedSport: SportTypeWithIcon | null;
  status: RecordingStatus;
  trackingStatus: TrackingStatus | null;
  localDuration: number;
  currentStats: LiveActivityStats;
  distance: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  nextMilestone: MilestoneSingle | undefined;
  gpsProfile: GpsProfile | null;
  onPause: () => void;
  onStop: () => void;
}

export function RecordingView({
  selectedSport,
  status,
  trackingStatus,
  localDuration,
  currentStats,
  distance,
  isLoading,
  isAuthenticated,
  nextMilestone,
  gpsProfile,
  onPause,
  onStop,
}: RecordingViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance: fmtDistance, formatPaceFromSecPerKm, formatElevation, getPaceUnit, getMilestoneLabel } = useUnits();

  const minDistance = gpsProfile?.minDistanceForPace ?? 50;

  const formatCurrentPace = (): string => {
    if (currentStats.distance < minDistance) return '--:--';
    return formatPaceFromSecPerKm(currentStats.currentPace);
  };

  const formatAvgPace = (): string => {
    if (currentStats.distance < minDistance) return '--:--';
    const avgPace = calculateAveragePace(localDuration, currentStats.distance, minDistance);
    return formatPaceFromSecPerKm(avgPace);
  };

  return (
    <View style={styles.container}>
      {/* Compact Header */}
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
            }]}
              accessibilityLabel={t(`recording.gpsSignal.${trackingStatus.gpsSignal}`)}
            >
              <Ionicons
                name="locate"
                size={14}
                color={trackingStatus.gpsSignal === 'good' ? colors.success :
                       trackingStatus.gpsSignal === 'weak' ? colors.warning : colors.error}
              />
              <Text style={[styles.gpsSignalText, {
                color: trackingStatus.gpsSignal === 'good' ? colors.success :
                       trackingStatus.gpsSignal === 'weak' ? colors.warning : colors.error
              }]}>
                {t(`recording.gpsSignal.${trackingStatus.gpsSignal}`)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* Hero Timer */}
        <View style={styles.heroTimerContainer}>
          <Text style={[styles.heroTimer, { color: colors.textPrimary }]}>
            {formatTime(localDuration)}
          </Text>
        </View>

        {/* Live Stats */}
        <View style={[styles.liveStatsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.liveStatItem}>
            <Text style={[styles.liveStatValue, { color: colors.primary }]}>
              {fmtDistance(distance)}
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
              {formatAvgPace()}
            </Text>
            <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
              {t('recording.avgPace')} {getPaceUnit()}
            </Text>
          </View>
        </View>

        {/* Elevation (if available) */}
        {currentStats.elevation_gain > 0 && (
          <View style={[styles.elevationRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="trending-up" size={16} color={colors.primary} />
            <Text style={[styles.elevationText, { color: colors.textSecondary }]}>
              {formatElevation(currentStats.elevation_gain)} {t('recording.elevationGain')}
            </Text>
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={onPause}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={32} color={colors.white} />
            <Text style={styles.controlButtonText}>{t('recording.pause')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.error }]}
            onPress={onStop}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="stop" size={32} color={colors.white} />
            <Text style={styles.controlButtonText}>{t('recording.stop')}</Text>
          </TouchableOpacity>
        </View>

        {/* Next Milestone */}
        {isAuthenticated && nextMilestone && (() => {
          const progressPercent = Math.min(100, Math.round((distance / nextMilestone.threshold) * 100));
          const remaining = Math.max(0, nextMilestone.threshold - distance);
          return (
            <View style={[styles.milestoneIndicator, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.milestoneIndicatorLeft}>
                <Ionicons name="flag" size={16} color={colors.primary} />
                <Text style={[styles.milestoneIndicatorText, { color: colors.textSecondary }]}>
                  {t('recording.nextMilestone')}: {getMilestoneLabel(MILESTONE_KM[nextMilestone.type] || nextMilestone.type)}
                </Text>
              </View>
              <View style={styles.milestoneIndicatorRight}>
                <Text style={[styles.milestoneIndicatorProgress, { color: colors.primary }]}>
                  {fmtDistance(remaining)} {t('recording.toGo')}
                </Text>
              </View>
              <View style={[styles.milestoneProgressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.milestoneProgressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          );
        })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  compactHeaderLeft: {
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
  compactHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gpsIndicator: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  gpsSignalText: {
    fontSize: 11,
    fontWeight: '600',
  },
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
  controlButtonText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 4,
  },
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
});
