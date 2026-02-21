import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { LiveActivityStats, TrackingStatus } from '../../../hooks/useLiveActivity';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { GpsProfile } from '../../../config/gpsProfiles';
import { calculateAveragePace } from '../../../utils/paceCalculator';
import { formatTime } from '../../../utils/formatters';
import { spacing, fontSize, borderRadius } from '../../../theme';

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

interface PausedViewProps {
  selectedSport: SportTypeWithIcon | null;
  status: RecordingStatus;
  trackingStatus: TrackingStatus | null;
  localDuration: number;
  currentStats: LiveActivityStats;
  distance: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  skipAutoPost: boolean;
  gpsProfile: GpsProfile | null;
  onResume: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onSkipAutoPostChange: (value: boolean) => void;
}

export function PausedView({
  selectedSport,
  status,
  trackingStatus,
  localDuration,
  currentStats,
  distance,
  isLoading,
  isAuthenticated,
  skipAutoPost,
  gpsProfile,
  onResume,
  onSave,
  onDiscard,
  onSkipAutoPostChange,
}: PausedViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatDistance: fmtDistance, formatPaceFromSecPerKm, getPaceUnit } = useUnits();

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

        {/* Resume Button */}
        <TouchableOpacity
          style={[styles.resumeButton, { backgroundColor: colors.primary }]}
          onPress={onResume}
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
              onPress={() => onSkipAutoPostChange(!skipAutoPost)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Switch
                value={skipAutoPost}
                onValueChange={onSkipAutoPostChange}
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
            onPress={onSave}
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
            onPress={onDiscard}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
});
