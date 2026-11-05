import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../i18n';
import { stripImagesMetadata, type LocalImage } from './imageMetadata';

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
  /** Downscale so the longer side is at most this many pixels. */
  maxSide?: number;
  /** JPEG quality of the copy that is returned (see utils/imageMetadata). */
  quality?: number;
}

/**
 * Ask for the permission, open the gallery or the camera, return what was picked
 * (empty when cancelled or denied). A denied permission always tells the user why
 * nothing happened.
 *
 * What comes back is never the file the picker produced but a re-encoded copy
 * without EXIF (location, device, date) — see utils/imageMetadata. An image that
 * cannot be re-encoded is left out, and the user is told.
 */
export async function pickImages(options: PickImagesOptions = {}): Promise<LocalImage[]> {
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
  const { images, failed } = await stripImagesMetadata(
    result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height })),
    { maxSide: options.maxSide, quality: options.quality },
  );
  if (failed > 0) alertImagesLeftOut();
  return images;
}

/** For callers that open the picker themselves and strip with utils/imageMetadata. */
export function alertImagesLeftOut(): void {
  Alert.alert(i18n.t('common.error'), i18n.t('common.imagePrepareFailed'));
}
