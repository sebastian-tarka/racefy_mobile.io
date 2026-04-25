import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Badge, MapboxLiveMap, PremiumTeaser } from '../../../components';
import type { MapStyleType } from '../../../components/MapboxLiveMap';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { LiveActivityStats, TrackingStatus } from '../../../hooks/useLiveActivity';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { GpsProfile } from '../../../config/gpsProfiles';
import type { Event, GpsPoint } from '../../../types/api';
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
  canUseAiPostOnFinish: boolean;
  gpsProfile: GpsProfile | null;
  livePoints: GpsPoint[];
  livePointsVersion: number;
  currentPosition: { lat: number; lng: number } | null;
  mapStyle: MapStyleType;
  selectedEvent: Event | null;
  onShowEventSheet: () => void;
  onClearEvent: () => void;
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
  canUseAiPostOnFinish,
  gpsProfile,
  livePoints,
  livePointsVersion,
  currentPosition,
  mapStyle,
  selectedEvent,
  onShowEventSheet,
  onClearEvent,
  onResume,
  onSave,
  onDiscard,
  onSkipAutoPostChange,
}: PausedViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

      {/* TOP — timer + stats + actions (fixed, no flex grow) */}
      <View style={styles.topSection}>
        <View style={styles.heroTimerContainer}>
          <Text style={[styles.heroTimer, { color: colors.textPrimary }]}>
            {formatTime(localDuration)}
          </Text>
        </View>

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

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onResume}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={26} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>
              {t('recording.resume')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={onSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={26} color={colors.white} />
                <Text style={[styles.actionButtonText, { color: colors.white }]}>
                  {t('recording.saveActivity')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '15', borderColor: colors.error, borderWidth: 1 }]}
            onPress={onDiscard}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              {t('recording.discard')}
            </Text>
          </TouchableOpacity>
        </View>

        {isAuthenticated && canUseAiPostOnFinish && (
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
        {isAuthenticated && !canUseAiPostOnFinish && (
          <PremiumTeaser feature="ai_post_on_finish">
            <View style={styles.skipPostRow}>
              <Switch value={false} disabled />
              <Text style={[styles.skipPostText, { color: colors.textSecondary }]}>
                {t('recording.skipAutoPost')}
              </Text>
            </View>
          </PremiumTeaser>
        )}
      </View>

      {/* BOTTOM — event selector + map (fills remaining space, respects nav bar) */}
      <View style={[styles.bottomSection, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={[
            styles.eventSelector,
            { backgroundColor: colors.cardBackground, borderColor: selectedEvent ? colors.primary : colors.border },
          ]}
          onPress={onShowEventSheet}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {selectedEvent ? (
            <>
              <View style={[styles.eventIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons
                  name={(selectedEvent.sport_type?.icon as any) || 'calendar-outline'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.eventSelectorContent}>
                <Text style={[styles.eventSelectorTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedEvent.post?.title || t('eventDetail.untitled')}
                </Text>
                {selectedEvent.location_name ? (
                  <Text style={[styles.eventSelectorSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedEvent.location_name}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={onClearEvent}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.eventIconContainer, { backgroundColor: colors.textMuted + '20' }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
              </View>
              <Text style={[styles.eventSelectorPlaceholder, { color: colors.textSecondary }]}>
                {t('recording.selectEvent', 'Wybierz wydarzenie (opcjonalnie)')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.mapFill}>
          <MapboxLiveMap
            livePoints={livePoints}
            livePointsVersion={livePointsVersion}
            currentPosition={currentPosition}
            gpsSignalQuality={trackingStatus?.gpsSignal ?? 'disabled'}
            followUser={livePoints.length === 0}
            mapStyle={mapStyle}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  mapFill: {
    flex: 1,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
    paddingVertical: spacing.md,
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  skipPostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  skipPostText: {
    fontSize: fontSize.sm,
  },
  eventSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventSelectorContent: {
    flex: 1,
  },
  eventSelectorTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  eventSelectorSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  eventSelectorPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
  },
});
