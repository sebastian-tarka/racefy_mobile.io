/**
 * RecordingMapControls - Minimalistic bottom controls overlay for map view
 * Shows essential stats and control buttons with semi-transparent background
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, borderRadius } from '../theme/spacing';
import { formatTime, formatDistance } from '../utils/formatters';
import { formatPaceDisplay } from '../utils/paceCalculator';

interface RecordingMapControlsProps {
  duration: number;
  distance: number;
  currentPace: number | null;
  isPaused: boolean;
  isLoading: boolean;
  onPause: () => void;
  onStop: () => void;
  onResume: () => void;

  // Shadow track feature
  shadowTrackTitle?: string | null;
  onClearShadowTrack?: () => void;
}

export function RecordingMapControls({
  duration,
  distance,
  currentPace,
  isPaused,
  isLoading,
  onPause,
  onStop,
  onResume,
  shadowTrackTitle,
  onClearShadowTrack,
}: RecordingMapControlsProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground + 'F0' }]}>
      {/* Shadow track indicator chip */}
      {shadowTrackTitle && onClearShadowTrack && (
        <View style={[styles.shadowTrackChip, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="map-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.shadowTrackText, { color: colors.textMuted }]} numberOfLines={1}>
            {shadowTrackTitle}
          </Text>
          <TouchableOpacity onPress={onClearShadowTrack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Timer display (large, centered) */}
      <Text style={[styles.timer, { color: colors.textPrimary }]}>{formatTime(duration)}</Text>

      {/* Stats row (distance and current pace) */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatDistance(distance)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {t('recording.distance')}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {formatPaceDisplay(currentPace)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {t('recording.currentPace')}
          </Text>
        </View>
      </View>

      {/* Control buttons */}
      <View style={styles.controlsRow}>
        {isPaused ? (
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={onResume}
            disabled={isLoading}
          >
            <Ionicons name="play" size={32} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.primary }]}
            onPress={onPause}
            disabled={isLoading}
          >
            <Ionicons name="pause" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.error }]}
          onPress={onStop}
          disabled={isLoading}
        >
          <Ionicons name="stop" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  shadowTrackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  shadowTrackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  timer: {
    fontSize: 48,
    fontWeight: '200',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    gap: spacing.md,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
