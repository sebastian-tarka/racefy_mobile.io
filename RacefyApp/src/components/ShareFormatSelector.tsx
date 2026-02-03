import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { fixStorageUrl } from '../config/api';
import type { ShareLinkResponse } from '../types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_PREVIEW_WIDTH = SCREEN_WIDTH - spacing.md * 4;

export type ShareFormat = 'social' | 'story' | 'square';

interface ShareFormatSelectorProps {
  activityId: number;
  onShare: (imageUrl: string | null, shareData: ShareLinkResponse) => void;
  onClose: () => void;
}

interface FormatOption {
  id: ShareFormat;
  icon: keyof typeof Ionicons.glyphMap;
  aspectRatio: number;
  dimensions: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'social',
    icon: 'newspaper-outline',
    aspectRatio: 1200 / 630,
    dimensions: '1200×630',
  },
  {
    id: 'story',
    icon: 'phone-portrait-outline',
    aspectRatio: 1080 / 1920,
    dimensions: '1080×1920',
  },
  {
    id: 'square',
    icon: 'square-outline',
    aspectRatio: 1,
    dimensions: '1080×1080',
  },
];

export function ShareFormatSelector({
  activityId,
  onShare,
  onClose,
}: ShareFormatSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>('social');
  const [isLoading, setIsLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareLinkResponse | null>(null);
  const [imageError, setImageError] = useState(false);

  // Load share data for selected format
  const loadShareData = async (format: ShareFormat) => {
    setIsLoading(true);
    setImageError(false);
    setShareData(null);

    try {
      logger.info('general', 'Loading share data', { activityId, format });
      const data = await api.getActivityShareLink(activityId, { format });

      if (!data.image) {
        logger.warn('general', 'Share data has no image', { activityId, format });
      }

      setShareData(data);
      logger.info('general', 'Share data loaded', {
        activityId,
        format,
        hasImage: !!data.image,
      });
    } catch (error) {
      logger.error('general', 'Failed to load share data', {
        activityId,
        format,
        error,
      });
      setImageError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle format selection
  const handleFormatSelect = (format: ShareFormat) => {
    setSelectedFormat(format);
    loadShareData(format);
  };

  // Handle share button press
  const handleShare = () => {
    if (shareData) {
      onShare(shareData.image || null, shareData);
    }
  };

  // Handle text-only share
  const handleTextOnlyShare = () => {
    if (shareData) {
      onShare(null, shareData);
    }
  };

  // Load initial format on mount
  useEffect(() => {
    loadShareData(selectedFormat);
  }, []);

  const selectedOption = FORMAT_OPTIONS.find((opt) => opt.id === selectedFormat);
  const imageHeight = selectedOption
    ? IMAGE_PREVIEW_WIDTH / selectedOption.aspectRatio
    : 200;

  return (
    <View style={styles.container}>
      {/* Format selector buttons */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('share.selectFormat')}
      </Text>

      <View style={styles.formatGrid}>
        {FORMAT_OPTIONS.map((option) => {
          const isSelected = selectedFormat === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.formatButton,
                {
                  backgroundColor: isSelected
                    ? colors.primary + '15'
                    : colors.cardBackground,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => handleFormatSelect(option.id)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.formatLabel,
                  {
                    color: isSelected ? colors.primary : colors.textPrimary,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {t(`share.format.${option.id}`)}
              </Text>
              <Text style={[styles.formatDimensions, { color: colors.textSecondary }]}>
                {option.dimensions}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Image preview */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('share.preview')}
      </Text>

      <View
        style={[
          styles.previewContainer,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            height: imageHeight + spacing.md * 2,
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {t('share.generatingImage')}
            </Text>
          </View>
        ) : imageError ? (
          <View style={styles.centerContent}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {t('share.imageError')}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => loadShareData(selectedFormat)}
            >
              <Text style={[styles.retryButtonText, { color: colors.white }]}>
                {t('share.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : shareData?.image ? (
          <Image
            source={{ uri: fixStorageUrl(shareData.image) || shareData.image }}
            style={[
              styles.previewImage,
              {
                width: IMAGE_PREVIEW_WIDTH,
                height: imageHeight,
              },
            ]}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.centerContent}>
            <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {t('share.noImage')}
            </Text>
          </View>
        )}
      </View>

      {/* Share buttons */}
      <TouchableOpacity
        style={[
          styles.shareButton,
          {
            backgroundColor: colors.primary,
            opacity: !shareData || isLoading ? 0.5 : 1,
          },
        ]}
        onPress={handleShare}
        disabled={!shareData || isLoading}
        activeOpacity={0.7}
      >
        <Ionicons name="share-outline" size={20} color={colors.white} />
        <Text style={[styles.shareButtonText, { color: colors.white }]}>
          {isLoading ? t('share.generating') : t('share.shareImage')}
        </Text>
      </TouchableOpacity>

      {/* Alternative: Share without image */}
      {shareData && (
        <TouchableOpacity
          style={styles.textOnlyButton}
          onPress={handleTextOnlyShare}
          activeOpacity={0.7}
        >
          <Text style={[styles.textOnlyButtonText, { color: colors.textSecondary }]}>
            {t('share.shareTextOnly')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formatGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formatButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 100,
    justifyContent: 'center',
  },
  formatLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  formatDimensions: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs / 2,
  },
  previewContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  shareButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  textOnlyButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  textOnlyButtonText: {
    fontSize: fontSize.sm,
  },
});
