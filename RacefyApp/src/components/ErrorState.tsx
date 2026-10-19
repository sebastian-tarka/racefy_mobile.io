import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { fontSize, spacing } from '../theme';

interface ErrorStateProps {
  message: string;
  /** Shows a "Try again" button when given. */
  onRetry?: () => void;
}

/** Full-screen "could not load" state of a detail screen, with an optional retry. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && <Button title={t('common.tryAgain')} onPress={onRetry} variant="primary" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    fontSize: fontSize.lg,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
});
