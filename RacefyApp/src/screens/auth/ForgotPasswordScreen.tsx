import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTranslation } from 'react-i18next';
import { Input, Button, BrandLogo, ScreenContainer } from '../../components';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { logger } from '../../services/logger';
import { spacing, fontSize } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email) {
      setError(t('auth.validation.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.validation.emailInvalid'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      setIsSent(true);
    } catch (err: any) {
      logger.error('auth', 'Forgot password error', { error: err });
      const message = err?.message || t('auth.forgotPasswordFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <BrandLogo category="logo-full" width={200} height={56} />
          </View>

          <View style={[styles.form, { backgroundColor: colors.cardBackground, shadowColor: colors.black }]}>
            {isSent ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="mail-outline" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('auth.checkYourEmail')}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {t('auth.resetLinkSent', { email })}
                </Text>
                <Button
                  title={t('auth.backToLogin')}
                  onPress={() => navigation.navigate('Login')}
                  fullWidth
                  style={styles.button}
                />
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('auth.forgotPassword')}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {t('auth.forgotPasswordDescription')}
                </Text>

                <Input
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="mail-outline"
                  error={error}
                />

                <Button
                  title={t('auth.sendResetLink')}
                  onPress={handleSubmit}
                  loading={isLoading}
                  fullWidth
                  style={styles.button}
                />

                <Button
                  title={t('auth.backToLogin')}
                  onPress={() => navigation.navigate('Login')}
                  variant="ghost"
                  fullWidth
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  form: {
    padding: spacing.xl,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});