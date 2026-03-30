import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Button, BrandLogo } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { VideoPlayerManager } from '../../services/VideoPlayerManager';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

// All available hero videos — one is picked at random each mount
const HERO_VIDEOS = [
  require('../../../assets/brand/Brand_Identity_wUQR4uR7.mp4'),
  require('../../../assets/brand/Brand_Identity_b_oowpLr.mp4'),
  require('../../../assets/brand/Brand_Identity_oy2YG61.mp4'),
  require('../../../assets/brand/Brand_Identity_PHrPDjIV.mp4'),
  require('../../../assets/brand/Brand_Identity_YvZ8BMqF.mp4'),
  require('../../../assets/brand/Brand_Identity_A_person_runs_down_a_darkened_street_lined_with_jrJvCCAH.mp4'),
];

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

let landingPlayerIdCounter = 0;

// ---------- Sub-components ----------

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconCircle, { backgroundColor: `${colors.primary}20` }]}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={[styles.featureItemTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.featureItemDesc, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

interface LanguageOption {
  code: string;
  label: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'EN' },
  { code: 'pl', label: 'PL' },
  { code: 'es', label: 'ES' },
];

// ---------- Main component ----------

export function LandingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const playerIdRef = useRef<string>(`landing-video-${++landingPlayerIdCounter}-${Date.now()}`);

  // Pick a random video on each mount
  const heroVideoSource = useMemo(
    () => HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)],
    [],
  );

  const player = useVideoPlayer(heroVideoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
  });

  useEffect(() => {
    VideoPlayerManager.register(playerIdRef.current, player);
    try {
      player.currentTime = 0;
      VideoPlayerManager.playExclusive(playerIdRef.current);
    } catch {}
    return () => VideoPlayerManager.unregister(playerIdRef.current);
  }, [player]);

  const currentLang = i18n.language?.substring(0, 2) || 'en';

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

  const features: FeatureItemProps[] = [
    {
      icon: 'people-outline',
      title: t('landing.features.connect.title'),
      description: t('landing.features.connect.description'),
      colors,
    },
    {
      icon: 'calendar-outline',
      title: t('landing.features.events.title'),
      description: t('landing.features.events.description'),
      colors,
    },
    {
      icon: 'bar-chart-outline',
      title: t('landing.features.track.title'),
      description: t('landing.features.track.description'),
      colors,
    },
    {
      icon: 'chatbubbles-outline',
      title: t('landing.features.liveCommentary.title'),
      description: t('landing.features.liveCommentary.description'),
      colors,
    },
    {
      icon: 'clipboard-outline',
      title: t('landing.features.trainingPlans.title'),
      description: t('landing.features.trainingPlans.description'),
      colors,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ===== HERO — full screen with video ===== */}
        <View style={[styles.hero, { height: SCREEN_HEIGHT }]}>
          {/* Video */}
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            contentFit="cover"
            allowsPictureInPicture={false}
          />

          {/* Dark overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <BrandLogo category="logo-full" variant="light" width={120} height={34} />

            <View style={styles.topBarRight}>
              {/* Language toggle */}
              <View style={styles.langToggle}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleLanguageChange(lang.code)}
                    style={[
                      styles.langBtn,
                      currentLang === lang.code && styles.langBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        currentLang === lang.code && styles.langBtnTextActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Login */}
              <TouchableOpacity onPress={handleSignIn} style={styles.loginBtn}>
                <Text style={styles.loginBtnText}>{t('landing.login')}</Text>
              </TouchableOpacity>

              {/* Sign Up */}
              <TouchableOpacity
                onPress={handleGetStarted}
                style={[styles.signUpBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.signUpBtnText}>{t('landing.signUp')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Center content */}
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitle}>
              {t('landing.heroTitlePart1')}{' '}
              <Text style={[styles.heroTitle, { color: colors.primary }]}>
                {t('landing.heroTitleHighlight')}
              </Text>
            </Text>
            <Text style={styles.heroSubtitle}>{t('landing.heroSubtitle')}</Text>

            {/* CTA buttons */}
            <View style={styles.heroCtas}>
              <TouchableOpacity
                onPress={handleGetStarted}
                style={[styles.ctaPrimary, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.ctaPrimaryText}>{t('landing.getStartedFree')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignIn}
                style={styles.ctaOutline}
              >
                <Text style={[styles.ctaOutlineText, { color: colors.primary }]}>
                  {t('landing.exploreEvents')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ===== FEATURES ===== */}
        <View style={styles.featuresSection}>
          {/* Top row: 3 items */}
          <View style={styles.featuresRow}>
            {features.slice(0, 3).map((f, i) => (
              <FeatureItem key={i} {...f} />
            ))}
          </View>
          {/* Bottom row: 2 items */}
          <View style={styles.featuresRow}>
            {features.slice(3, 5).map((f, i) => (
              <FeatureItem key={i + 3} {...f} />
            ))}
          </View>
        </View>

        {/* ===== CTA BOTTOM ===== */}
        <View style={styles.ctaBottom}>
          <Text style={[styles.ctaBottomTitle, { color: colors.textPrimary }]}>
            {t('landing.ctaTitle')}
          </Text>
          <Text style={[styles.ctaBottomDesc, { color: colors.textSecondary }]}>
            {t('landing.ctaDescription')}
          </Text>

          <Button
            title={t('landing.getStartedFree')}
            onPress={handleGetStarted}
            fullWidth
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.signInRow}>
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

        {/* ===== FOOTER ===== */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {t('app.name')} — {t('app.tagline')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Hero
  hero: {
    width: '100%',
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  langBtnActive: {
    backgroundColor: '#10b981',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  loginBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signUpBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  heroCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: SCREEN_WIDTH * 0.9,
    marginBottom: spacing.xl,
  },
  heroCtas: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  ctaPrimary: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  ctaPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  ctaOutline: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  ctaOutlineText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Features
  featuresSection: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    maxWidth: SCREEN_WIDTH / 3,
  },
  featureIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureItemDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  // CTA bottom
  ctaBottom: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  ctaBottomTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ctaBottomDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signInText: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 12,
  },
});
