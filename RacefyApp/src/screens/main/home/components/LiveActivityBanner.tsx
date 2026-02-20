import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { useUnits } from '../../../../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../../../../theme';

interface LiveActivityBannerProps {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  distance: number;
  onPress: () => void;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


export function LiveActivityBanner({
  isActive,
  isPaused,
  duration,
  distance,
  onPress,
}: LiveActivityBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance } = useUnits();
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for the recording indicator
  useEffect(() => {
    if (isActive && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive, isPaused, pulseAnim]);

  if (!isActive) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isPaused ? colors.warning : '#ef4444' },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.leftSection}>
        <Animated.View
          style={[
            styles.recordingDot,
            { transform: [{ scale: isPaused ? 1 : pulseAnim }] },
          ]}
        >
          <View style={[styles.dot, isPaused && styles.pausedDot]} />
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {isPaused
              ? t('home.liveActivity.paused', 'Activity Paused')
              : t('home.liveActivity.recording', 'Recording Activity')}
          </Text>
          <Text style={styles.statsText}>
            {formatDuration(duration)} • {formatDistance(distance)}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.tapText}>{t('home.liveActivity.tap', 'Tap to view')}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  pausedDot: {
    width: 8,
    height: 10,
    borderRadius: 2,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  statsText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapText: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginRight: spacing.xs,
  },
});
