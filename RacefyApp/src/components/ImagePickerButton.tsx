import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '../theme';

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

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('common.error'),
        'Permission to access photos is required to select an image.'
      );
      return;
    }

    // On Android, disable editing to avoid crop screen issues
    // On iOS, editing works fine
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === 'ios',
      aspect: aspectRatio,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('common.error'),
        'Permission to access camera is required to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === 'ios',
      aspect: aspectRatio,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
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
        }
      );
    } else {
      Alert.alert(
        t('eventForm.selectImage'),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('eventForm.takePhoto'), onPress: launchCamera },
          { text: t('eventForm.chooseFromGallery'), onPress: launchGallery },
        ]
      );
    }
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('eventForm.coverImage')}</Text>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        {value ? (
          <>
            <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
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
            <Text style={styles.placeholderText}>
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.cardBackground,
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
    color: colors.textMuted,
    textAlign: 'center',
  },
});
