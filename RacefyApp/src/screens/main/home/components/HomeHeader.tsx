import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../theme';

interface HomeHeaderProps {
  userName?: string;
  isAuthenticated: boolean;
  onNotificationPress?: () => void;
}

export function HomeHeader({ userName, isAuthenticated, onNotificationPress }: HomeHeaderProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <BrandLogo category="logo-full" variant={isDark ? 'light' : 'dark'} width={140} height={40} />
        <TouchableOpacity
          style={[styles.notificationButton, { backgroundColor: colors.cardBackground }]}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {isAuthenticated && userName && (
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t('home.greeting', { name: userName })}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
  },
});
