import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Button } from '../../../../components';
import { colors, spacing, fontSize } from '../../../../theme';

interface AuthCardProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function AuthCard({ onSignIn, onSignUp }: AuthCardProps) {
  const { t } = useTranslation();

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>{t('home.getStarted')}</Text>
      <Text style={styles.subtitle}>{t('home.getStartedMessage')}</Text>
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
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
