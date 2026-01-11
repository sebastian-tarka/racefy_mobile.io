import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, BrandLogo } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function FeatureCard({ icon, title, description, colors }: FeatureCardProps) {
  return (
    <View style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
      <View style={[styles.featureIconContainer, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

interface LanguageOption {
  code: string;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

export function LandingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    await AsyncStorage.setItem('@racefy_language', langCode);
    setShowLanguageSelector(false);
  };

  const handleGetStarted = () => {
    navigation.navigate('Auth', { screen: 'Register' });
  };

  const handleSignIn = () => {
    navigation.navigate('Auth', { screen: 'Login' });
  };

  const features = [
    {
      icon: 'fitness-outline' as const,
      title: t('landing.features.track.title'),
      description: t('landing.features.track.description'),
    },
    {
      icon: 'people-outline' as const,
      title: t('landing.features.connect.title'),
      description: t('landing.features.connect.description'),
    },
    {
      icon: 'trophy-outline' as const,
      title: t('landing.features.events.title'),
      description: t('landing.features.events.description'),
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selector */}
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={[styles.languageButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => setShowLanguageSelector(!showLanguageSelector)}
          >
            <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
            <Text style={[styles.languageText, { color: colors.textPrimary }]}>{currentLanguage.label}</Text>
            <Ionicons
              name={showLanguageSelector ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showLanguageSelector && (
            <View style={[styles.languageDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    lang.code === currentLanguage.code && { backgroundColor: `${colors.primary}15` },
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[styles.languageText, { color: colors.textPrimary }]}>{lang.label}</Text>
                  {lang.code === currentLanguage.code && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <BrandLogo category="logo-full" width={200} height={56} />

          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {t('landing.heroTitle')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {t('landing.heroSubtitle')}
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('landing.whyRacefy')}
          </Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={isDark ? ['#064e3b', '#065f46'] : ['#ecfdf5', '#d1fae5']}
            style={[styles.ctaCard, { borderColor: colors.primary }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.ctaTitle, { color: isDark ? '#ffffff' : colors.textPrimary }]}>
              {t('landing.ctaTitle')}
            </Text>
            <Text style={[styles.ctaDescription, { color: isDark ? '#d1fae5' : colors.textSecondary }]}>
              {t('landing.ctaDescription')}
            </Text>
          </LinearGradient>

          <Button
            title={t('landing.getStarted')}
            onPress={handleGetStarted}
            fullWidth
            style={styles.primaryButton}
          />

          <View style={styles.signInContainer}>
            <Text style={[styles.signInText, { color: colors.textSecondary }]}>
              {t('landing.alreadyHaveAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={[styles.signInLink, { color: colors.primary }]}>
                {t('landing.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {t('app.name')} - {t('app.tagline')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  languageContainer: {
    alignItems: 'flex-end',
    marginTop: spacing.md,
    zIndex: 100,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  languageDropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minWidth: 140,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
  },
  heroTitle: {
    marginTop: spacing.xxl,
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  featuresSection: {
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: spacing.md,
  },
  featureCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  ctaSection: {
    marginBottom: spacing.xxl,
  },
  ctaCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  ctaTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  ctaDescription: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  primaryButton: {
    marginBottom: spacing.lg,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: fontSize.md,
  },
  signInLink: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.sm,
  },
});