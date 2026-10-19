import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../i18n';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

interface PickImagesOptions {
  /** Default 'library'. */
  source?: 'library' | 'camera';
  /** Library only. */
  multiple?: boolean;
  /** Library only, with `multiple`. */
  selectionLimit?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
  /** Shown when permission is denied; defaults to the generic gallery/camera message. */
  deniedMessage?: string;
}

/**
 * Ask for the permission, open the gallery or the camera, return what was picked
 * (empty when cancelled or denied). A denied permission always tells the user why
 * nothing happened.
 */
export async function pickImages(options: PickImagesOptions = {}): Promise<PickedImage[]> {
  const camera = options.source === 'camera';

  const { status } = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      i18n.t('common.error'),
      options.deniedMessage ?? i18n.t(camera ? 'permissions.camera' : 'permissions.gallery'),
    );
    return [];
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    quality: 0.8,
    allowsEditing: options.allowsEditing,
    aspect: options.aspect,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(pickerOptions)
    : await ImagePicker.launchImageLibraryAsync({
        ...pickerOptions,
        allowsMultipleSelection: options.multiple ?? false,
        selectionLimit: options.selectionLimit,
      });

  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}
