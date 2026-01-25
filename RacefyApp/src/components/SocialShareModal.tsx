import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { ShareLinkResponse } from '../types/api';

type ShareableType = 'activity' | 'post' | 'event' | 'comment';

interface SocialShareModalProps {
  visible: boolean;
  onClose: () => void;
  type: ShareableType;
  id: number;
  title?: string;
  description?: string;
}

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

function SocialShareModalComponent({
  visible,
  onClose,
  type,
  id,
  title,
  description,
}: SocialShareModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch share link from API when modal opens
  useEffect(() => {
    if (visible && id) {
      fetchShareLink();
    }
  }, [visible, type, id]);

  const fetchShareLink = async () => {
    setIsLoading(true);
    try {
      let response: ShareLinkResponse;

      switch (type) {
        case 'activity':
          response = await api.getActivityShareLink(id);
          break;
        case 'post':
          response = await api.getPostShareLink(id);
          break;
        case 'event':
          response = await api.getEventShareLink(id);
          break;
        case 'comment':
          response = await api.getCommentShareLink(id);
          break;
        default:
          throw new Error(`Unsupported share type: ${type}`);
      }

      console.log('resp',response)

      // Validate response structure
      if (!response || !response.url) {
        logger.error('general', 'Invalid share link response', {
          type,
          id,
          response,
          hasResponse: !!response,
          hasUrl: response?.url,
          responseKeys: response ? Object.keys(response) : []
        });
        throw new Error('Invalid response from server - missing url');
      }

      logger.info('general', 'Share link fetched', { type, id, url: response.url });
      setShareData(response);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch share link', {
        type,
        id,
        error: err,
        errorMessage: err?.message,
        errorStack: err?.stack
      });

      const errorMessage = err?.message || t('share.fetchError');
      Alert.alert(
        t('common.error'),
        errorMessage,
        [{ text: t('common.ok'), onPress: onClose }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformShare = async (platformId: string) => {
    if (!shareData) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Use backend-generated platform URL if available
      const platformUrl = shareData.platforms[platformId as keyof typeof shareData.platforms]?.url;

      if (platformUrl) {
        // For web-based sharing, we would need Linking.openURL in a real app
        // Since this is React Native, we'll use the native share instead
        logger.info('general', 'Platform share URL', { platform: platformId, url: platformUrl });

        // For now, just use native share with the content
        await handleNativeShare();
      }
    } catch (err) {
      logger.error('general', 'Failed to share to platform', { platform: platformId, error: err });
    }
  };

  const handleNativeShare = async () => {
    if (!shareData) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await Share.share({
        title: shareData.title,
        message: `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}`,
        url: shareData.url,
      });

      if (result.action === Share.sharedAction) {
        logger.info('general', 'Content shared via native share', {
          type,
          id,
          sharedWith: result.activityType,
        });
      }
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        logger.error('general', 'Native share failed', { error: err });
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareData) return;

    try {
      await Clipboard.setStringAsync(shareData.url);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setCopied(true);
      logger.info('general', 'Share link copied', { type, id });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('general', 'Failed to copy link', { error: err });
      Alert.alert(t('common.error'), t('share.copyError'));
    }
  };

  const handleClose = () => {
    setShareData(null);
    setCopied(false);
    onClose();
  };

  const shareUrl = shareData?.url || '';
  const shareTitle = shareData?.title || title || t('share.defaultTitle');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              <View
                style={[styles.modalHeader, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('share.title')}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLoading}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('share.loading')}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Native share button */}
                  <TouchableOpacity
                    style={[
                      styles.nativeShareButton,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={handleNativeShare}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={20} color={colors.white} />
                    <Text style={[styles.nativeShareText, { color: colors.white }]}>
                      {t('share.shareVia')}
                    </Text>
                  </TouchableOpacity>

                  {/* Platform buttons */}
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
                          },
                        ]}
                        onPress={() => handlePlatformShare(platform.id)}
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

                  {/* Copy link section */}
                  <View
                    style={[
                      styles.copyLinkSection,
                      { borderTopColor: colors.border },
                    ]}
                  >
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
                      <TextInput
                        style={[
                          styles.linkInput,
                          { color: colors.textSecondary },
                        ]}
                        value={shareUrl}
                        editable={false}
                        numberOfLines={1}
                      />
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
                  </View>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    minHeight: 400,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  nativeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.lg,
  },
  nativeShareText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  copyLinkSection: {
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkInput: {
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

export const SocialShareModal = memo(SocialShareModalComponent);