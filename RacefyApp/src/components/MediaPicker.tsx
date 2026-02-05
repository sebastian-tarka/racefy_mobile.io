import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { MediaThumbnail } from './MediaThumbnail';
import { spacing, fontSize, borderRadius } from '../theme';
import { logger } from '../services/logger';
import type { MediaItem } from '../types/api';

interface MediaPickerProps {
  media: MediaItem[];
  onChange: (media: MediaItem[]) => void;
  maxItems?: number;
  allowVideo?: boolean;
}

export function MediaPicker({
  media,
  onChange,
  maxItems = 10,
  allowVideo = true,
}: MediaPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const canAddMore = media.length < maxItems;

  // Maximum file size: 100MB for videos, 10MB for images
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB

  const checkFileSize = async (uri: string, type: 'image' | 'video'): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        logger.error('media', 'File does not exist', { uri });
        return false;
      }

      const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      const sizeMB = (fileInfo.size / (1024 * 1024)).toFixed(1);

      if (fileInfo.size > maxSize) {
        const maxSizeMB = type === 'video' ? '100' : '10';
        Alert.alert(
          t('common.error'),
          `${type === 'video' ? 'Video' : 'Image'} size is too large (${sizeMB}MB). Maximum allowed: ${maxSizeMB}MB`
        );
        logger.warn('media', 'File size exceeds limit', {
          uri,
          sizeMB,
          maxSizeMB,
          type
        });
        return false;
      }

      logger.debug('media', 'File size check passed', { uri, sizeMB, type });
      return true;
    } catch (error) {
      logger.error('media', 'Error checking file size', { uri, error });
      // If we can't check size, allow it (better UX than blocking)
      return true;
    }
  };

  const pickFromGallery = async (mediaType: 'image' | 'video' | 'all') => {
    try {
      logger.debug('media', 'Requesting media library permissions', { mediaType });

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('media', 'Media library permission denied');
        Alert.alert(t('common.error'), t('permissions.gallery'));
        return;
      }

      let options: ImagePicker.ImagePickerOptions = {
        mediaTypes:
          mediaType === 'all'
            ? ['images', 'videos']
            : mediaType === 'video'
            ? 'videos'
            : 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxItems - media.length,
      };

      logger.debug('media', 'Launching image library', { options });
      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets.length > 0) {
        logger.info('media', 'Media selected', { count: result.assets.length });

        // Filter out files that are too large
        const validAssets: typeof result.assets = [];
        for (const asset of result.assets) {
          const assetType = asset.type === 'video' ? 'video' : 'image';
          const isValid = await checkFileSize(asset.uri, assetType);

          if (isValid) {
            validAssets.push(asset);
          }
        }

        if (validAssets.length === 0) {
          logger.warn('media', 'No valid assets after size check');
          return;
        }

        const newMedia: MediaItem[] = validAssets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          width: asset.width,
          height: asset.height,
        }));

        const updatedMedia = [...media, ...newMedia].slice(0, maxItems);
        logger.info('media', 'Media added', {
          newCount: newMedia.length,
          totalCount: updatedMedia.length
        });
        onChange(updatedMedia);
      } else {
        logger.debug('media', 'Media selection cancelled');
      }
    } catch (error) {
      logger.error('media', 'Error picking from gallery', { error, mediaType });
      Alert.alert(
        t('common.error'),
        'Failed to select media. Please try again or choose a different file.'
      );
    }
  };

  const takePhoto = async () => {
    try {
      logger.debug('media', 'Requesting camera permissions for photo');

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('media', 'Camera permission denied');
        Alert.alert(t('common.error'), t('permissions.camera'));
        return;
      }

      logger.debug('media', 'Launching camera for photo');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isValid = await checkFileSize(asset.uri, 'image');

        if (!isValid) {
          return;
        }

        const newItem: MediaItem = {
          uri: asset.uri,
          type: 'image',
          width: asset.width,
          height: asset.height,
        };
        logger.info('media', 'Photo taken successfully', { uri: asset.uri });
        onChange([...media, newItem]);
      } else {
        logger.debug('media', 'Photo capture cancelled');
      }
    } catch (error) {
      logger.error('media', 'Error taking photo', { error });
      Alert.alert(
        t('common.error'),
        'Failed to take photo. Please try again.'
      );
    }
  };

  const recordVideo = async () => {
    try {
      logger.debug('media', 'Requesting camera permissions for video');

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        logger.warn('media', 'Camera permission denied for video');
        Alert.alert(t('common.error'), t('permissions.camera'));
        return;
      }

      logger.debug('media', 'Launching camera for video');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'videos',
        videoMaxDuration: 60, // 60 seconds max
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isValid = await checkFileSize(asset.uri, 'video');

        if (!isValid) {
          return;
        }

        const newItem: MediaItem = {
          uri: asset.uri,
          type: 'video',
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          width: asset.width,
          height: asset.height,
        };
        logger.info('media', 'Video recorded successfully', {
          uri: asset.uri,
          duration: newItem.duration
        });
        onChange([...media, newItem]);
      } else {
        logger.debug('media', 'Video recording cancelled');
      }
    } catch (error) {
      logger.error('media', 'Error recording video', { error });
      Alert.alert(
        t('common.error'),
        'Failed to record video. Please check permissions and try again.'
      );
    }
  };

  const handleRemove = (index: number) => {
    const updated = media.filter((_, i) => i !== index);
    onChange(updated);
  };

  const showMediaOptions = (mediaType: 'image' | 'video') => {
    if (!canAddMore) {
      Alert.alert(t('common.error'), t('feed.maxMediaReached', { count: maxItems }));
      return;
    }

    const isVideo = mediaType === 'video';

    if (Platform.OS === 'ios') {
      // iOS: Use native action sheet
      const options = [
        t('common.cancel'),
        isVideo ? t('feed.recordVideo') : t('feed.takePhoto'),
        t('feed.chooseFromLibrary'),
      ];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Camera
            void (isVideo ? recordVideo() : takePhoto());
          } else if (buttonIndex === 2) {
            // Gallery
            void pickFromGallery(mediaType);
          }
        }
      );
    } else {
      // Android: Use Alert dialog
      Alert.alert(
        isVideo ? t('feed.addVideo') : t('feed.addPhoto'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('feed.chooseFromLibrary'),
            onPress: () => void pickFromGallery(mediaType),
          },
          {
            text: isVideo ? t('feed.recordVideo') : t('feed.takePhoto'),
            onPress: () => void (isVideo ? recordVideo() : takePhoto()),
          },
        ]
      );
    }
  };

  const handleAddPhoto = () => {
    showMediaOptions('image');
  };

  const handleAddVideo = () => {
    showMediaOptions('video');
  };

  if (media.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity
          style={[styles.addTypeButton, { borderColor: colors.border }]}
          onPress={handleAddPhoto}
        >
          <Ionicons name="image-outline" size={28} color={colors.primary} />
          <Text style={[styles.addTypeText, { color: colors.textSecondary }]}>
            {t('feed.addPhoto')}
          </Text>
        </TouchableOpacity>
        {allowVideo && (
          <TouchableOpacity
            style={[styles.addTypeButton, { borderColor: colors.border }]}
            onPress={handleAddVideo}
          >
            <Ionicons name="videocam-outline" size={28} color={colors.primary} />
            <Text style={[styles.addTypeText, { color: colors.textSecondary }]}>
              {t('feed.addVideo')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {media.map((item, index) => (
          <MediaThumbnail
            key={`${item.uri}-${index}`}
            item={item}
            onRemove={() => handleRemove(index)}
          />
        ))}
        {canAddMore && (
          <View style={styles.addMoreContainer}>
            <TouchableOpacity
              style={[
                styles.addMoreButton,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={handleAddPhoto}
            >
              <Ionicons name="image-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            {allowVideo && (
              <TouchableOpacity
                style={[
                  styles.addMoreButton,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={handleAddVideo}
              >
                <Ionicons name="videocam-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      <Text style={[styles.countText, { color: colors.textMuted }]}>
        {media.length}/{maxItems}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  emptyContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  addTypeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addTypeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  addMoreContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  addMoreButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});
