import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  /** Target date to count down to */
  targetDate: Date | string;
  /** Optional title text (defaults to translation key) */
  title?: string;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Show/hide the title */
  showTitle?: boolean;
  /** Custom icon name */
  icon?: keyof typeof Ionicons.glyphMap;
}

export function CountdownTimer({
  targetDate,
  title,
  onComplete,
  variant = 'default',
  showTitle = true,
  icon = 'time-outline',
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [countdown, setCountdown] = useState<CountdownTime | null>(null);

  const calculateCountdown = useCallback(() => {
    const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      setCountdown(null);
      return false;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setCountdown({ days, hours, minutes, seconds });
    return true;
  }, [targetDate]);

  useEffect(() => {
    const shouldContinue = calculateCountdown();

    if (shouldContinue) {
      const interval = setInterval(() => {
        const continueInterval = calculateCountdown();
        if (!continueInterval) {
          clearInterval(interval);
          onComplete?.();
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      onComplete?.();
    }
  }, [calculateCountdown, onComplete]);

  if (!countdown) {
    return null;
  }

  const displayTitle = title || t('countdown.default');

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[styles.compactText, { color: colors.primary }]}>
          {countdown.days > 0 && `${countdown.days}d `}
          {countdown.hours.toString().padStart(2, '0')}:
          {countdown.minutes.toString().padStart(2, '0')}:
          {countdown.seconds.toString().padStart(2, '0')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '10' }]}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons name={icon} size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.primary }]}>
            {displayTitle}
          </Text>
        </View>
      )}
      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {countdown.days.toString().padStart(2, '0')}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('countdown.days')}
          </Text>
        </View>
        <Text style={[styles.separator, { color: colors.textPrimary }]}>:</Text>
        <View style={styles.item}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {countdown.hours.toString().padStart(2, '0')}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('countdown.hours')}
          </Text>
        </View>
        <Text style={[styles.separator, { color: colors.textPrimary }]}>:</Text>
        <View style={styles.item}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {countdown.minutes.toString().padStart(2, '0')}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('countdown.minutes')}
          </Text>
        </View>
        <Text style={[styles.separator, { color: colors.textPrimary }]}>:</Text>
        <View style={styles.item}>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {countdown.seconds.toString().padStart(2, '0')}
          </Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('countdown.seconds')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  item: {
    alignItems: 'center',
    minWidth: 48,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  separator: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  compactText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
