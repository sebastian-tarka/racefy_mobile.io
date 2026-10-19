import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { pickImages } from '../utils/pickImages';

interface ImagePickerButtonProps {
  value: string | null;
  onChange: (uri: string | null) => void;
  aspectRatio?: [number, number];
  placeholder?: string;
}

export function ImagePickerButton({
  value,
  onChange,
  aspectRatio = [16, 9],
  placeholder,
}: ImagePickerButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const launchGallery = async () => {
    // On Android, disable editing to avoid crop screen issues
    // On iOS, editing works fine
    const [asset] = await pickImages({
      allowsEditing: Platform.OS === 'ios',
      aspect: aspectRatio,
    });
    if (asset) onChange(asset.uri);
  };

  const launchCamera = async () => {
    const [asset] = await pickImages({
      source: 'camera',
      allowsEditing: Platform.OS === 'ios',
      aspect: aspectRatio,
    });
    if (asset) onChange(asset.uri);
  };

  const pickImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('eventForm.takePhoto'), t('eventForm.chooseFromGallery')],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            launchCamera();
          } else if (buttonIndex === 2) {
            launchGallery();
          }
        },
      );
    } else {
      Alert.alert(t('eventForm.selectImage'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('eventForm.takePhoto'), onPress: launchCamera },
        { text: t('eventForm.chooseFromGallery'), onPress: launchGallery },
      ]);
    }
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{t('eventForm.coverImage')}</Text>
      <TouchableOpacity
        style={[
          styles.imageContainer,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        {value ? (
          <>
            <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.cardBackground }]}
              onPress={removeImage}
            >
              <Ionicons name="close-circle" size={28} color={colors.error} />
            </TouchableOpacity>
            <View style={styles.changeOverlay}>
              <Ionicons name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.changeText}>{t('common.edit')}</Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              {placeholder || t('eventForm.tapToSelectImage')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    borderRadius: 14,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
