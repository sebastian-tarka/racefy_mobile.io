import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import type { LiveActivityStats } from '../../../hooks/useLiveActivity';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { GpsProfile } from '../../../config/gpsProfiles';
import type { Event, GpsPoint } from '../../../types/api';
import { MapboxLiveMap, StatBlock } from '../../../components';
import type { MapStyleType } from '../../../components/MapboxLiveMap';
import { calculateAveragePace } from '../../../utils/paceCalculator';
import { formatTime } from '../../../utils/formatters';
import { upgradePromptEmitter } from '../../../services/upgradePromptEmitter';
import { useSubscription } from '../../../hooks/useSubscription';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';

interface FinishViewProps {
  selectedSport: SportTypeWithIcon | null;
  localDuration: number;
  currentStats: LiveActivityStats;
  distance: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Keeping an activity out of the feed is a paid feature (`ai_post_on_finish`). */
  canSkipAutoPost: boolean;
  gpsProfile: GpsProfile | null;
  livePoints: GpsPoint[];
  livePointsVersion: number;
  currentPosition: { lat: number; lng: number } | null;
  mapStyle: MapStyleType;
  selectedEvent: Event | null;
  onShowEventSheet: () => void;
  onClearEvent: () => void;
  /** Back to the (paused) live screen — nothing is saved or lost. */
  onBack: () => void;
  /** `share: false` keeps the activity out of the feed (skip_auto_post). */
  onSave: (options: { title: string; share: boolean }) => void;
  onDiscard: () => void;
}

/**
 * The finish screen (design "Racefy v2" → FinishScreen).
 *
 * Replaces the old "stop saves immediately, then an Alert tells you what
 * happened" flow: the athlete first sees what they just did — editable title,
 * the track, the four numbers — and only then decides between keeping it private
 * and sharing it. Backing out returns to the paused activity, so a mis-held stop
 * button costs nothing.
 *
 * The design's "How did it feel?" row is deliberately absent: the API has no
 * field to put it in — see .notes/AKTYWNOSC_REDESIGN_V2.md.
 */
export function FinishView({
  selectedSport,
  localDuration,
  currentStats,
  distance,
  isLoading,
  isAuthenticated,
  canSkipAutoPost,
  gpsProfile,
  livePoints,
  livePointsVersion,
  currentPosition,
  mapStyle,
  selectedEvent,
  onShowEventSheet,
  onClearEvent,
  onBack,
  onSave,
  onDiscard,
}: FinishViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const insets = useSafeAreaInsets();
  const { formatDistance: fmtDistance, formatPaceFromSecPerKm, getPaceUnit } = useUnits();

  const [title, setTitle] = useState(
    selectedSport ? t('recording.finish.defaultTitle', { sport: selectedSport.name }) : '',
  );

  const minDistance = gpsProfile?.minDistanceForPace ?? 50;
  const avgPace =
    currentStats.distance < minDistance
      ? '--:--'
      : formatPaceFromSecPerKm(
          calculateAveragePace(localDuration, currentStats.distance, minDistance),
        );
  const calories = Math.floor(localDuration * 0.15);
  const hasHeartRate = (currentStats.avg_heart_rate ?? 0) > 0;

  // Free accounts get the auto-post either way; "save private" is the upsell.
  const savePrivate = () => {
    if (isAuthenticated && !canSkipAutoPost) {
      upgradePromptEmitter.emit('show', { feature: 'ai_post_on_finish', currentTier: tier });
      return;
    }
    onSave({ title, share: false });
  };

  const confirmDiscard = () => {
    Alert.alert(t('recording.discardActivity'), t('recording.discardConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('recording.discard'), style: 'destructive', onPress: onDiscard },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border }]}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('recording.finish.title')}
        </Text>
        <TouchableOpacity
          onPress={confirmDiscard}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('recording.discardActivity')}
        >
          <Text style={[styles.discardLink, { color: colors.error }]}>
            {t('recording.discard')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHead}>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
              {(selectedSport?.name ?? t('recording.title')).toUpperCase()} ·{' '}
              {t('recording.status.finished').toUpperCase()}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={[styles.titleInput, { color: colors.textPrimary }]}
              placeholder={t('recording.finish.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              maxLength={120}
              accessibilityLabel={t('recording.finish.titlePlaceholder')}
            />
          </View>

          {gpsProfile?.enabled !== false && (
            <View style={[styles.map, { borderColor: colors.border }]}>
              <MapboxLiveMap
                livePoints={livePoints}
                livePointsVersion={livePointsVersion}
                currentPosition={currentPosition}
                gpsSignalQuality="disabled"
                followUser={false}
                mapStyle={mapStyle}
              />
            </View>
          )}

          <View style={styles.statsGrid}>
            <StatBlock
              style={styles.statCell}
              size="lg"
              accent
              label={t('recording.duration').toUpperCase()}
              value={formatTime(localDuration)}
            />
            <StatBlock
              style={styles.statCell}
              size="lg"
              label={t('recording.distance').toUpperCase()}
              value={fmtDistance(distance)}
            />
            <StatBlock
              style={styles.statCell}
              size="lg"
              label={t('recording.avgPace').toUpperCase()}
              value={avgPace}
              unit={getPaceUnit()}
            />
            {hasHeartRate ? (
              <StatBlock
                style={styles.statCell}
                size="lg"
                label={t('recording.heartRate').toUpperCase()}
                value={String(Math.round(currentStats.avg_heart_rate ?? 0))}
                unit={t('recording.bpm')}
              />
            ) : (
              <StatBlock
                style={styles.statCell}
                size="lg"
                label={t('recording.calories').toUpperCase()}
                value={String(calories)}
                unit={t('recording.kcal')}
              />
            )}
          </View>
        </View>

        {/* Event link — carried over from the old paused screen. */}
        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={onShowEventSheet}
          activeOpacity={0.8}
          accessibilityLabel={t('recording.selectEvent')}
        >
          <View style={[styles.rowIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons
              name={selectedEvent ? 'calendar' : 'calendar-outline'}
              size={18}
              color={selectedEvent ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
              {t('recording.linkToEvent')}
            </Text>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedEvent?.post?.title || t('recording.selectEvent')}
            </Text>
          </View>
          {selectedEvent ? (
            <TouchableOpacity
              onPress={onClearEvent}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('common.clear')}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      </ScrollView>

      <View
        style={[
          styles.actions,
          {
            paddingBottom: insets.bottom + spacing.lg,
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.background }]}
          onPress={savePrivate}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isAuthenticated && !canSkipAutoPost && (
            <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          )}
          <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
            {t('recording.finish.savePrivate')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
          ]}
          onPress={() => onSave({ title, share: isAuthenticated })}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryText}>
              {isAuthenticated ? t('recording.finish.saveAndShare') : t('recording.saveActivity')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  discardLink: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl + 4,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  cardHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  titleInput: {
    marginTop: spacing.sm,
    padding: 0,
    fontSize: msFont(22),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  map: {
    height: 150,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    rowGap: spacing.lg,
  },
  statCell: {
    width: '50%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  rowValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1.4,
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
