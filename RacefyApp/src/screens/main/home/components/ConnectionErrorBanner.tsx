import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '../../../../theme';

interface ConnectionErrorBannerProps {
  error?: string;
  apiUrl: string;
  onRetry: () => void;
}

export function ConnectionErrorBanner({ error, apiUrl, onRetry }: ConnectionErrorBannerProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onRetry}
      activeOpacity={0.8}
    >
      <Ionicons name="cloud-offline" size={20} color={colors.white} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('home.connectionError')}</Text>
        <Text style={styles.message}>{error || t('home.checkConnection')}</Text>
        <Text style={styles.hint}>API: {apiUrl}</Text>
      </View>
      <Ionicons name="refresh" size={20} color={colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    color: colors.white,
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginTop: 2,
  },
  hint: {
    color: colors.white,
    fontSize: fontSize.xs,
    opacity: 0.7,
    marginTop: 4,
  },
});
