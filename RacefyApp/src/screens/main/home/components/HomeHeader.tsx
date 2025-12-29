import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../theme';

interface HomeHeaderProps {
  userName?: string;
  isAuthenticated: boolean;
}

export function HomeHeader({ userName, isAuthenticated }: HomeHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Ionicons name="walk" size={32} color={colors.primary} />
        <Text style={[styles.logo, { color: colors.primary }]}>{t('app.name')}</Text>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
  },
});
