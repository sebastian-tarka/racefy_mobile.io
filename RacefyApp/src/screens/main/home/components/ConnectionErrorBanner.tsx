import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../theme';

interface ConnectionErrorBannerProps {
  error?: string;
  apiUrl: string;
  onRetry: () => void;
}

export function ConnectionErrorBanner({ error, apiUrl, onRetry }: ConnectionErrorBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.error }]}
      onPress={onRetry}
      activeOpacity={0.8}
    >
      <Ionicons name="cloud-offline" size={20} color={colors.white} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.white }]}>{t('home.connectionError')}</Text>
        <Text style={[styles.message, { color: colors.white }]}>{error || t('home.checkConnection')}</Text>
        <Text style={[styles.hint, { color: colors.white }]}>API: {apiUrl}</Text>
      </View>
      <Ionicons name="refresh" size={20} color={colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginTop: 2,
  },
  hint: {
    fontSize: fontSize.xs,
    opacity: 0.7,
    marginTop: 4,
  },
});
