import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useMaintenance } from '../../hooks/useMaintenance';
import { Button, BrandLogo } from '../../components';
import { spacing, fontSize, borderRadius } from '../../theme';

export function MaintenanceScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { message, estimatedEnd, checkMaintenance } = useMaintenance();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      await checkMaintenance();
    } finally {
      setChecking(false);
    }
  };

  const formattedEnd = estimatedEnd ? formatEstimatedEnd(estimatedEnd, t) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <BrandLogo category="logo-full" width={160} height={44} />

        <View style={[styles.iconContainer, { backgroundColor: isDark ? '#78350f' : '#fffbeb' }]}>
          <Ionicons name="construct-outline" size={48} color={colors.warning} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('maintenance.title')}
        </Text>

        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message || t('maintenance.defaultMessage')}
        </Text>

        {formattedEnd && (
          <View style={[styles.estimatedContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.estimatedText, { color: colors.textSecondary }]}>
              {t('maintenance.estimatedEnd')}{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{formattedEnd}</Text>
            </Text>
          </View>
        )}

        <View style={styles.retryContainer}>
          {checking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Button
              title={t('maintenance.retry')}
              onPress={handleRetry}
              variant="outline"
            />
          )}
        </View>
      </View>
    </View>
  );
}

function formatEstimatedEnd(isoDate: string, t: (key: string) => string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `${t('maintenance.today')} ${time}`;
    }

    const dateStr = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return `${dateStr} ${time}`;
  } catch {
    return isoDate;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  estimatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  estimatedText: {
    fontSize: fontSize.sm,
  },
  retryContainer: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});