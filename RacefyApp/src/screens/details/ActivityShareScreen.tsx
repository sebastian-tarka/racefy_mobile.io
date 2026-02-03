import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, ShareFormatSelector } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { shareActivityWithImage, shareToApp } from '../../utils/share';
import { logger } from '../../services/logger';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { ShareLinkResponse } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityShare'>;

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
  const { activityId } = route.params;
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentShareData, setCurrentShareData] = useState<ShareLinkResponse | null>(null);

  const handleShare = async (imageUrl: string | null, shareData: ShareLinkResponse) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Store share data for platform buttons and copy functionality
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

      // Don't navigate back - let user choose to share to multiple platforms
      // navigation.goBack();
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

      // Special handling for Messenger (WebP compatibility issues)
      if (platformId === 'messenger') {
        Alert.alert(
          '📱 Messenger Sharing',
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
        // For other platforms, use native share
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
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
        {/* Format Selector with Image Preview */}
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

        {/* Bottom padding for better scrolling */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
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
