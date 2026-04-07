import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../../hooks/useTheme';
import { Button } from '../../../../components';
import { spacing, fontSize } from '../../../../theme';
import { VideoPlayerManager } from '../../../../services/VideoPlayerManager';

const heroVideo = require('../../../../../assets/brand/Brand_Identity_wUQR4uR7.mp4');

const HERO_HEIGHT = Dimensions.get('window').height * 0.45;

let heroPlayerIdCounter = 0;

interface HeroSectionProps {
  isAuthenticated: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function HeroSection({ isAuthenticated, onSignIn, onSignUp }: HeroSectionProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const playerIdRef = useRef<string>(`hero-video-${++heroPlayerIdCounter}-${Date.now()}`);

  const player = useVideoPlayer(heroVideo, (p) => {
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

  return (
    <View style={styles.container}>
      {/* Video Background */}
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
      />

      {/* Dark Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{t('home.heroTitle')}</Text>
        <Text style={styles.subtitle}>{t('home.heroSubtitle')}</Text>

        {!isAuthenticated && onSignIn && onSignUp && (
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
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
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
