import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { fixStorageUrl } from '../config/api';
import type { Photo, PhotoOverlayFormat } from '../types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLUMNS = 4;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - spacing.md * 4 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface PhotoOverlaySelectorProps {
  activityId: number;
  photos?: Photo[];
  onImageGenerated?: (imageUrl: string) => void;
}

interface FormatOption {
  id: PhotoOverlayFormat;
  label: string;
  dimensions: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'photo_social', label: 'Social', dimensions: '1200×630' },
  { id: 'photo_story', label: 'Story', dimensions: '1080×1920' },
  { id: 'photo_square', label: 'Square', dimensions: '1080×1080' },
];

const ASPECT_RATIOS: Record<PhotoOverlayFormat, number> = {
  photo_social: 1200 / 630,
  photo_story: 1080 / 1920,
  photo_square: 1,
};

export function PhotoOverlaySelector({
  activityId,
  photos = [],
  onImageGenerated,
}: PhotoOverlaySelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedFormat, setSelectedFormat] = useState<PhotoOverlayFormat>('photo_story');
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [overlayImageUrl, setOverlayImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewWidth = SCREEN_WIDTH - spacing.md * 4;
  const previewHeight = previewWidth / ASPECT_RATIOS[selectedFormat];

  const handleSelectPhoto = async (photoId: number) => {
    setSelectedPhotoId(photoId);
    setOverlayImageUrl(null);
    setError(null);
    await generateOverlay(photoId, selectedFormat);
  };

  const handleFormatChange = async (format: PhotoOverlayFormat) => {
    setSelectedFormat(format);
    setOverlayImageUrl(null);
    setError(null);
    if (selectedPhotoId) {
      await generateOverlay(selectedPhotoId, format);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('permissions.mediaLibrary'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const uriParts = asset.uri.split('.');
      const ext = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const file = {
        uri: asset.uri,
        type: mimeType,
        name: asset.fileName || `photo.${ext}`,
      };

      setSelectedPhotoId(null);
      setOverlayImageUrl(null);
      setError(null);
      setIsGenerating(true);

      try {
        const response = await api.generatePhotoOverlayFromFile(activityId, file, selectedFormat);
        const fixedUrl = fixStorageUrl(response.image) || response.image;
        setOverlayImageUrl(fixedUrl);
        setSelectedPhotoId(response.photo_id);
        onImageGenerated?.(fixedUrl);
        logger.info('general', 'Photo overlay generated from upload', { activityId, format: selectedFormat });
      } catch (err) {
        logger.error('general', 'Photo overlay from upload failed', { error: err });
        setError(t('share.photoOverlayFailed'));
      } finally {
        setIsGenerating(false);
      }
    } catch (err) {
      logger.error('general', 'Image picker failed', { error: err });
    }
  };

  const generateOverlay = async (photoId: number, format: PhotoOverlayFormat) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.generatePhotoOverlay(activityId, photoId, format);
      const fixedUrl = fixStorageUrl(response.image) || response.image;
      setOverlayImageUrl(fixedUrl);
      onImageGenerated?.(fixedUrl);
      logger.info('general', 'Photo overlay generated', { activityId, photoId, format });
    } catch (err) {
      logger.error('general', 'Photo overlay generation failed', { error: err });
      setError(t('share.photoOverlayFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!overlayImageUrl) return;

    try {
      const filename = `racefy-overlay-${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      const download = await FileSystem.downloadAsync(overlayImageUrl, localUri);

      if (download.status === 200) {
        // Use Sharing to let the user save/export the file
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(download.uri, {
            mimeType: 'image/jpeg',
            UTI: 'public.jpeg',
            dialogTitle: t('share.saveToGallery'),
          });
        }
        logger.info('general', 'Photo overlay save triggered');
      }
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        logger.error('general', 'Save to gallery failed', { error: err });
        Alert.alert(t('common.error'), t('share.saveFailed'));
      }
    }
  };

  const handleShare = async () => {
    if (!overlayImageUrl) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) return;

      const filename = `racefy-overlay-${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      const download = await FileSystem.downloadAsync(overlayImageUrl, localUri);

      if (download.status === 200) {
        await Sharing.shareAsync(download.uri, {
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
        });

        setTimeout(() => {
          FileSystem.deleteAsync(download.uri, { idempotent: true }).catch(() => {});
        }, 10000);
      }
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        logger.error('general', 'Photo overlay share failed', { error: err });
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Format Selector */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('share.selectFormat')}
      </Text>

      <View style={styles.formatRow}>
        {FORMAT_OPTIONS.map((option) => {
          const isSelected = selectedFormat === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.formatButton,
                {
                  backgroundColor: isSelected ? colors.primary + '15' : colors.cardBackground,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => handleFormatChange(option.id)}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.formatLabel,
                  {
                    color: isSelected ? colors.primary : colors.textPrimary,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {t(`share.format.${option.label.toLowerCase()}`)}
              </Text>
              <Text style={[styles.formatDimensions, { color: colors.textSecondary }]}>
                {option.dimensions}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Photo Grid */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('share.selectPhoto')}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {t('share.selectPhotoHint')}
      </Text>

      <View style={styles.photoGrid}>
        {photos.map((photo) => {
          const isSelected = selectedPhotoId === photo.id;
          const photoUrl = fixStorageUrl(photo.url) || photo.url;
          return (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.photoItem,
                {
                  borderWidth: 2,
                  borderColor: isSelected ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => handleSelectPhoto(photo.id)}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: photoUrl }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
              {isSelected && (
                <View style={[styles.checkOverlay, { backgroundColor: colors.primary + '80' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.photoItem,
            styles.uploadButton,
            { borderColor: colors.border },
          ]}
          onPress={handlePickPhoto}
          disabled={isGenerating}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={32} color={colors.textSecondary} />
          <Text style={[styles.uploadLabel, { color: colors.textSecondary }]}>
            {t('share.uploadPhoto')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview / Loading / Error */}
      {(isGenerating || overlayImageUrl || error) && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.lg }]}>
            {t('share.preview')}
          </Text>

          <View
            style={[
              styles.previewContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                height: Math.min(previewHeight + spacing.md * 2, 500),
              },
            ]}
          >
            {isGenerating ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {t('share.generatingOverlay')}
                </Text>
              </View>
            ) : error ? (
              <View style={styles.centerContent}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
                {selectedPhotoId && (
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => generateOverlay(selectedPhotoId, selectedFormat)}
                  >
                    <Text style={[styles.retryButtonText, { color: colors.white }]}>
                      {t('share.retry')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : overlayImageUrl ? (
              <Image
                source={{ uri: overlayImageUrl }}
                style={[
                  styles.previewImage,
                  {
                    width: previewWidth,
                    height: Math.min(previewHeight, 470),
                  },
                ]}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </>
      )}

      {/* Action Buttons */}
      {overlayImageUrl && !isGenerating && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={20} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>
              {t('share.shareImage')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={handleSaveToGallery}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              {t('share.saveToGallery')}
            </Text>
          </TouchableOpacity>
        </View>
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
  hint: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
  },
  formatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formatButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  formatLabel: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  formatDimensions: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  checkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  previewContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  actionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
