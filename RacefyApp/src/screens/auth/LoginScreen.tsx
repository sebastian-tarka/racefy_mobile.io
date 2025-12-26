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
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();

  // Auto-close modal when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, closing auth modal');
      navigation.getParent()?.goBack();
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
      console.log('Login successful, navigating...');
      // Navigation should happen automatically when user state changes
      // But let's also try explicit navigation
      navigation.getParent()?.goBack();
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
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.logo}>{t('app.name')}</Text>
            <Text style={styles.tagline}>{t('app.tagline')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>{t('auth.signIn')}</Text>

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
              <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
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
    backgroundColor: colors.background,
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
    color: colors.primary,
    marginTop: spacing.md,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: colors.cardBackground,
    padding: spacing.xl,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
});
