import React, {useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {KeyboardAvoidingView} from 'react-native-keyboard-controller';
import {useTranslation} from 'react-i18next';
import {BrandLogo, Button, Input, ScreenContainer} from '../../components';
import {api} from '../../services/api';
import {useTheme} from '../../hooks/useTheme';
import {logger} from '../../services/logger';
import {fontSize, spacing} from '../../theme';
import {Ionicons} from '@expo/vector-icons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token, email } = route.params;

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!password) next.password = t('auth.validation.passwordRequired');
    else if (password.length < 8) next.password = t('auth.validation.passwordMinLength');
    if (!passwordConfirmation) next.passwordConfirmation = t('auth.validation.confirmPasswordRequired');
    else if (password !== passwordConfirmation) next.passwordConfirmation = t('auth.validation.passwordsNotMatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await api.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setIsDone(true);
    } catch (err: any) {
      logger.error('auth', 'Reset password error', { error: err });
      const message = err?.message || t('auth.resetPasswordFailed');
      Alert.alert(t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior="padding" style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <BrandLogo category="logo-full" width={200} height={56} />
          </View>

          <View style={[styles.form, { backgroundColor: colors.cardBackground, shadowColor: colors.black }]}>
            {isDone ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('auth.passwordResetSuccess')}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {t('auth.passwordResetSuccessDescription')}
                </Text>
                <Button
                  title={t('auth.signIn')}
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
                  fullWidth
                  style={styles.button}
                />
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('auth.resetPassword')}
                </Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {t('auth.resetPasswordDescription', { email })}
                </Text>

                <Input
                  label={t('auth.newPassword')}
                  placeholder={t('auth.createPasswordPlaceholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  leftIcon="lock-closed-outline"
                  error={errors.password}
                />

                <Input
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                  secureTextEntry
                  autoComplete="password-new"
                  leftIcon="lock-closed-outline"
                  error={errors.passwordConfirmation}
                />

                <Button
                  title={t('auth.resetPasswordAction')}
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
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: spacing.xxxl },
  form: {
    padding: spacing.xl,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', marginBottom: spacing.sm },
  description: { fontSize: fontSize.md, lineHeight: 22, marginBottom: spacing.xl },
  button: { marginTop: spacing.md },
  successContainer: { alignItems: 'center' },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});