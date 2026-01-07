import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../theme';

interface DynamicGreetingProps {
  userName?: string;
  isAuthenticated: boolean;
}

export function DynamicGreeting({ userName, isAuthenticated }: DynamicGreetingProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { greeting, icon, motivationalMessage } = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: t('home.greeting.morning', 'Good morning'),
        icon: 'sunny-outline' as const,
        motivationalMessage: t('home.motivation.morning', 'Start your day with energy!'),
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: t('home.greeting.afternoon', 'Good afternoon'),
        icon: 'partly-sunny-outline' as const,
        motivationalMessage: t('home.motivation.afternoon', 'Keep pushing forward!'),
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        greeting: t('home.greeting.evening', 'Good evening'),
        icon: 'moon-outline' as const,
        motivationalMessage: t('home.motivation.evening', 'Great time for a workout!'),
      };
    } else {
      return {
        greeting: t('home.greeting.night', 'Good night'),
        icon: 'cloudy-night-outline' as const,
        motivationalMessage: t('home.motivation.night', 'Rest well, champion!'),
      };
    }
  }, [t]);

  const displayName = isAuthenticated && userName ? userName.split(' ')[0] : null;

  return (
    <View style={styles.container}>
      <View style={styles.greetingRow}>
        <Ionicons name={icon} size={24} color={colors.primary} style={styles.icon} />
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          {greeting}{displayName ? `, ${displayName}` : ''}!
        </Text>
      </View>
      <Text style={[styles.motivation, { color: colors.textSecondary }]}>
        {motivationalMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  motivation: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    marginLeft: 32, // Align with text after icon
  },
});
