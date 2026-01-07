import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Input, Button, BrandLogo } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '../../navigation/types';
import type { CompositeScreenProps } from '@react-navigation/native';

type Props = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, 'Login'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { login, isAuthenticated } = useAuth();

  // Auto-close modal when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const parent = navigation.getParent();
      if (parent?.canGoBack()) {
        console.log('User authenticated, closing auth modal');
        parent.goBack();
      }
    }
  }, [isAuthenticated, navigation]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = t('auth.validation.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.validation.emailInvalid');
    }

    if (!password) {
      newErrors.password = t('auth.validation.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      console.log('Attempting login with:', email);
      await login({ email, password });
      console.log('Login successful');
      // Navigation handled by useEffect watching isAuthenticated
    } catch (error: any) {
      console.log('Login error:', error);
      const message =
        error?.message || t('auth.loginFailedMessage');
      Alert.alert(t('auth.loginFailed'), message);
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
            <BrandLogo category="logo-full" width={200} height={56} />
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('app.tagline')}</Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.cardBackground, shadowColor: colors.black }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.signIn')}</Text>

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
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              leftIcon="lock-closed-outline"
              error={errors.password}
            />

            <Button
              title={t('auth.signIn')}
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.signUp')}</Text>
              </TouchableOpacity>
            </View>

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
  tagline: {
    fontSize: fontSize.md,
    marginTop: spacing.lg,
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
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  legalLink: {
    fontSize: fontSize.sm,
  },
  legalSeparator: {
    fontSize: fontSize.sm,
  },
});
