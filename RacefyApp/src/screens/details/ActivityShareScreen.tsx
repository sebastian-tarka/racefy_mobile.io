import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, ShareFormatSelector, ScreenContainer } from '../../components';
import { PhotoOverlaySelector } from '../../components/PhotoOverlaySelector';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { shareActivityWithImage, shareToApp } from '../../utils/share';
import { logger } from '../../services/logger';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { ShareLinkResponse } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityShare'>;

type ShareMode = 'map' | 'photo';

interface SharePlatform {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const SHARE_PLATFORMS: SharePlatform[] = [
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'twitter', name: 'X / Twitter', icon: 'logo-twitter', color: '#000000' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
];

export function ActivityShareScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activityId, hasGpsTrack, photos } = route.params;
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentShareData, setCurrentShareData] = useState<ShareLinkResponse | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>('map');

  const canUsePhotoOverlay = !!hasGpsTrack;

  const handleShare = async (imageUrl: string | null, shareData: ShareLinkResponse) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setShareUrl(shareData.url);
      setCurrentImageUrl(imageUrl);
      setCurrentShareData(shareData);

      await shareActivityWithImage({
        activityId,
        imageUrl,
        shareData,
      });

      logger.info('general', 'Activity shared with image', {
        activityId,
        hasImage: !!imageUrl,
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        logger.error('general', 'Share with image failed', { error: err });
        Alert.alert(t('common.error'), t('share.fetchError'));
      }
    }
  };

  const handlePlatformShare = async (platformId: string) => {
    if (!currentShareData) {
      Alert.alert(t('common.error'), t('share.selectFormatFirst'));
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (platformId === 'messenger') {
        Alert.alert(
          'Messenger Sharing',
          'Messenger works best with a two-step process:\n\n1. Save the image to your Photos\n2. Share from Photos to Messenger\n\nWould you like to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share Anyway',
              onPress: async () => {
                await shareToApp('messenger', currentImageUrl, currentShareData);
              },
            },
          ]
        );
        return;
      }

      const validPlatforms = ['whatsapp', 'telegram', 'messenger'] as const;
      if (validPlatforms.includes(platformId as any)) {
        await shareToApp(
          platformId as 'whatsapp' | 'telegram' | 'messenger',
          currentImageUrl,
          currentShareData
        );
      } else {
        await shareActivityWithImage({
          activityId,
          imageUrl: currentImageUrl,
          shareData: currentShareData,
        });
      }

      logger.info('general', 'Shared to platform', { platform: platformId });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        logger.error('general', 'Platform share failed', { platform: platformId, error: err });
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await Clipboard.setStringAsync(shareUrl);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setCopied(true);
      logger.info('general', 'Share link copied', { activityId });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('general', 'Failed to copy link', { error: err });
      Alert.alert(t('common.error'), t('share.copyError'));
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('share.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Toggle - only shown when GPS track exists */}
        {canUsePhotoOverlay && (
          <View style={[styles.modeToggle, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                shareMode === 'map' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setShareMode('map')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="map-outline"
                size={18}
                color={shareMode === 'map' ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  { color: shareMode === 'map' ? colors.white : colors.textSecondary },
                ]}
              >
                {t('share.mapMode')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                shareMode === 'photo' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setShareMode('photo')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={shareMode === 'photo' ? colors.white : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeButtonText,
                  { color: shareMode === 'photo' ? colors.white : colors.textSecondary },
                ]}
              >
                {t('share.photoMode')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content based on mode */}
        {shareMode === 'photo' && canUsePhotoOverlay ? (
          <PhotoOverlaySelector
            activityId={activityId}
            photos={photos}
          />
        ) : (
          <>
            {/* Existing Route Map share flow */}
            <ShareFormatSelector
              activityId={activityId}
              onShare={handleShare}
              onClose={() => navigation.goBack()}
            />

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Platform Buttons */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('share.shareOn')}
            </Text>

            <View style={styles.platformsGrid}>
              {SHARE_PLATFORMS.map((platform) => (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformButton,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                      opacity: currentShareData ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => handlePlatformShare(platform.id)}
                  disabled={!currentShareData}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.platformIconContainer,
                      { backgroundColor: platform.color },
                    ]}
                  >
                    <Ionicons name={platform.icon} size={24} color="#FFFFFF" />
                  </View>
                  <Text
                    style={[styles.platformName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {platform.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Copy Link Section */}
            {shareUrl && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {t('share.copyLink')}
                </Text>

                <View
                  style={[
                    styles.linkContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.linkText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {shareUrl}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.copyButton,
                      {
                        backgroundColor: copied ? colors.success : colors.primary,
                      },
                    ]}
                    onPress={handleCopyLink}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={colors.white}
                    />
                    <Text style={[styles.copyButtonText, { color: colors.white }]}>
                      {copied ? t('share.copied') : t('share.copy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* Bottom padding */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  modeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  platformButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  platformIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  platformName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkText: {
    flex: 1,
    padding: spacing.sm,
    fontSize: fontSize.sm,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  copyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
