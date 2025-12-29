import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Button } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../theme';

interface AuthCardProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function AuthCard({ onSignIn, onSignUp }: AuthCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Card style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('home.getStarted')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('home.getStartedMessage')}</Text>
      <View style={styles.buttons}>
        <Button
          title={t('common.signIn')}
          onPress={onSignIn}
          variant="primary"
          style={styles.button}
        />
        <Button
          title={t('common.signUp')}
          onPress={onSignUp}
          variant="outline"
          style={styles.button}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
  },
});
