import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import type { CompositeScreenProps } from '@react-navigation/native';

type Props = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, 'Register'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name) {
      newErrors.name = t('auth.validation.nameRequired');
    } else if (name.length < 2) {
      newErrors.name = t('auth.validation.nameMinLength');
    }

    if (!email) {
      newErrors.email = t('auth.validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.validation.emailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.validation.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.validation.passwordMinLength');
    }

    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = t('auth.validation.confirmPasswordRequired');
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = t('auth.validation.passwordsNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
    } catch (error: any) {
      const message = error?.message || t('auth.registerFailedMessage');
      Alert.alert(t('auth.registerFailed'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="walk" size={48} color={colors.primary} />
            <Text style={[styles.logo, { color: colors.primary }]}>{t('app.name')}</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('app.tagline')}</Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.cardBackground, shadowColor: colors.black }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.createAccount')}</Text>

            <Input
              label={t('auth.name')}
              placeholder={t('auth.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              leftIcon="person-outline"
              error={errors.name}
            />

            <Input
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <Input
              label={t('auth.password')}
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
              title={t('auth.createAccount')}
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.haveAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.termsNotice, { color: colors.textMuted }]}>
              {t('legal.registerTermsNotice')}
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('LegalDocuments', { documentType: 'terms' })}>
                <Text style={[styles.legalLink, { color: colors.textSecondary }]}>{t('legal.terms')}</Text>
              </TouchableOpacity>
              <Text style={[styles.legalSeparator, { color: colors.textMuted }]}> • </Text>
              <TouchableOpacity onPress={() => navigation.navigate('LegalDocuments', { documentType: 'privacy' })}>
                <Text style={[styles.legalLink, { color: colors.textSecondary }]}>{t('legal.privacy')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  logo: {
    fontSize: fontSize.title,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  tagline: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
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
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.md,
  },
  footerLink: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  termsNotice: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  legalLink: {
    fontSize: fontSize.sm,
  },
  legalSeparator: {
    fontSize: fontSize.sm,
  },
});
