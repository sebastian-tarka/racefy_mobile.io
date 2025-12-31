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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { MediaThumbnail } from './MediaThumbnail';
import { spacing, fontSize, borderRadius } from '../theme';
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

  const pickFromGallery = async (mediaType: 'image' | 'video' | 'all') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
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

    const result = await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets.length > 0) {
      const newMedia: MediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        width: asset.width,
        height: asset.height,
      }));

      const updatedMedia = [...media, ...newMedia].slice(0, maxItems);
      onChange(updatedMedia);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.camera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newItem: MediaItem = {
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
      };
      onChange([...media, newItem]);
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.camera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      videoMaxDuration: 60, // 60 seconds max
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newItem: MediaItem = {
        uri: asset.uri,
        type: 'video',
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        width: asset.width,
        height: asset.height,
      };
      onChange([...media, newItem]);
    }
  };

  const handleAddMedia = () => {
    if (!canAddMore) {
      Alert.alert(
        t('common.error'),
        t('feed.maxMediaReached', { count: maxItems })
      );
      return;
    }

    const options = [
      t('common.cancel'),
      t('feed.takePhoto'),
      ...(allowVideo ? [t('feed.recordVideo')] : []),
      t('feed.chooseFromLibrary'),
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2 && allowVideo) {
            recordVideo();
          } else if (buttonIndex === (allowVideo ? 3 : 2)) {
            pickFromGallery(allowVideo ? 'all' : 'image');
          }
        }
      );
    } else {
      // Android: Show source selection first, then media type for camera
      Alert.alert(t('feed.addMedia'), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('feed.chooseFromLibrary'),
          onPress: () => pickFromGallery(allowVideo ? 'all' : 'image'),
        },
        {
          text: allowVideo ? t('feed.useCamera') : t('feed.takePhoto'),
          onPress: () => {
            if (allowVideo) {
              // Show second dialog for camera type
              Alert.alert(t('feed.useCamera'), undefined, [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('feed.takePhoto'), onPress: takePhoto },
                { text: t('feed.recordVideo'), onPress: recordVideo },
              ]);
            } else {
              takePhoto();
            }
          },
        },
      ]);
    }
  };

  const handleRemove = (index: number) => {
    const updated = media.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleAddPhoto = () => {
    if (!canAddMore) {
      Alert.alert(t('common.error'), t('feed.maxMediaReached', { count: maxItems }));
      return;
    }
    pickFromGallery('image');
  };

  const handleAddVideo = () => {
    if (!canAddMore) {
      Alert.alert(t('common.error'), t('feed.maxMediaReached', { count: maxItems }));
      return;
    }
    pickFromGallery('video');
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
