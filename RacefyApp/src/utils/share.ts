import { Share, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ShareLinkResponse } from '../types/api';
import { logger } from '../services/logger';
import { fixStorageUrl } from '../config/api';

export interface ShareActivityWithImageOptions {
  activityId: number;
  imageUrl?: string | null;
  shareData: ShareLinkResponse;
}

/**
 * Share activity with image support
 * iOS: Shares remote URL directly
 * Android: Downloads image first, then shares local file
 */
export async function shareActivityWithImage({
  imageUrl,
  shareData,
}: ShareActivityWithImageOptions): Promise<void> {
  try {
    // Prepare text content
    const message = `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}`;

    // Fix storage URL (convert localhost to proper IP for mobile devices)
    const fixedImageUrl = imageUrl ? fixStorageUrl(imageUrl) : null;

    // If no image, fall back to text-only share
    if (!fixedImageUrl) {
      logger.info('general', 'Sharing without image (text-only)', { url: shareData.url });
      await Share.share({
        message,
        title: shareData.title,
      });
      return;
    }

    // Check if sharing is available on this device
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      logger.warn('general', 'Sharing not available, falling back to text-only');
      await Share.share({
        message,
        title: shareData.title,
      });
      return;
    }

    // Download the image first for best compatibility
    logger.info('general', 'Downloading image for sharing', { imageUrl: fixedImageUrl });
    const localUri = await downloadImageForSharing(fixedImageUrl);

    if (!localUri) {
      // Fallback to text-only if download fails
      logger.warn('general', 'Image download failed, sharing text only');
      Alert.alert(
        'Download Failed',
        'Could not download the image. Sharing text only instead.',
        [{ text: 'OK' }]
      );
      await Share.share({
        message,
        title: shareData.title,
      });
      return;
    }

    // Double-check file exists before sharing
    try {
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        logger.error('general', 'Downloaded file does not exist at share time', { localUri });
        Alert.alert(
          'File Not Found',
          'The image file could not be found. Sharing text only instead.',
          [{ text: 'OK' }]
        );
        await Share.share({
          message,
          title: shareData.title,
        });
        return;
      }
      if ('size' in fileInfo) {
        logger.debug('general', 'File verified before share', { size: fileInfo.size, uri: localUri });
      }
    } catch (checkError) {
      logger.error('general', 'Failed to verify file before share', { error: checkError });
    }

    // Detect MIME type from file extension
    const mimeType = localUri.toLowerCase().endsWith('.jpg') || localUri.toLowerCase().endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/webp';

    // Use expo-sharing to share the image file
    // This properly handles file sharing on both iOS and Android
    logger.info('general', 'Attempting to share with expo-sharing', {
      localUri,
      mimeType,
      platform: Platform.OS,
    });

    try {
      // Try method 1: expo-sharing (most reliable for pure file sharing)
      logger.info('general', 'Trying Sharing.shareAsync', { mimeType });
      await Sharing.shareAsync(localUri, {
        mimeType,
        dialogTitle: shareData.title,
        UTI: 'public.image',
      });

      logger.info('general', 'Image shared successfully via expo-sharing');

      Alert.alert(
        '✅ Image Shared',
        'The image has been shared. Tap "Copy Link" below to copy the text and link to paste in your message.',
        [{ text: 'OK' }]
      );
    } catch (shareError: any) {
      logger.warn('general', 'expo-sharing failed, trying native Share as fallback', {
        error: shareError.message,
        code: shareError.code,
      });

      // Method 2: Try native Share API with Android content URI
      try {
        let shareUri = localUri;

        // On Android, convert to content:// URI for better compatibility
        if (Platform.OS === 'android') {
          try {
            const contentUri = await FileSystem.getContentUriAsync(localUri);
            logger.info('general', 'Converted to content URI', {
              fileUri: localUri,
              contentUri
            });
            shareUri = contentUri;
          } catch (contentUriError) {
            logger.warn('general', 'Could not get content URI, using file URI', {
              error: contentUriError
            });
          }
        }

        // Try native Share with the URI
        logger.info('general', 'Trying native Share.share', { uri: shareUri });
        await Share.share({
          title: shareData.title,
          message: message,
          url: shareUri,
        });

        logger.info('general', 'Image shared successfully via native Share');

        Alert.alert(
          '✅ Image Shared',
          'Image shared! Paste the text manually if needed.',
          [{ text: 'OK' }]
        );
      } catch (nativeShareError: any) {
        logger.error('general', 'Both sharing methods failed', {
          expoSharingError: shareError.message,
          nativeShareError: nativeShareError.message,
        });

        Alert.alert(
          '❌ Share Failed',
          'Could not share the image. Use "Share Text Only" button or save the image and share manually.',
          [{ text: 'OK' }]
        );

        throw nativeShareError;
      }
    }

    // Clean up downloaded file after sharing
    setTimeout(() => {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch((err) =>
        logger.warn('general', 'Failed to clean up downloaded share image', { error: err })
      );
    }, 10000);
  } catch (error: any) {
    // expo-sharing throws different error messages
    const isCancelled =
      error?.message === 'User did not share' ||
      error?.code === 'ERR_SHARING_CANCELLED' ||
      error?.message?.includes('cancel');

    if (!isCancelled) {
      logger.error('general', 'Share failed', { error, errorCode: error?.code });
      throw error;
    }
  }
}

/**
 * Download image to cache directory for sharing
 * Returns local file URI or null if download fails
 */
async function downloadImageForSharing(imageUrl: string): Promise<string | null> {
  try {
    logger.debug('general', 'Starting image download', { imageUrl });

    // Ensure cache directory exists
    if (!FileSystem.cacheDirectory) {
      logger.error('general', 'Cache directory not available');
      return null;
    }

    // Determine file extension from URL or default to webp
    const urlExt = imageUrl.toLowerCase().includes('.jpg') || imageUrl.toLowerCase().includes('.jpeg')
      ? 'jpg'
      : 'webp';
    const filename = `share-image-${Date.now()}.${urlExt}`;
    const localUri = `${FileSystem.cacheDirectory}${filename}`;

    logger.debug('general', 'Downloading to', { localUri, extension: urlExt });

    const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);

    logger.debug('general', 'Download completed', {
      status: downloadResult.status,
      uri: downloadResult.uri,
      headers: downloadResult.headers,
    });

    if (downloadResult.status === 200) {
      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      logger.debug('general', 'File info', { fileInfo });

      if (fileInfo.exists) {
        if ('size' in fileInfo && fileInfo.size > 0) {
          logger.info('general', 'Image downloaded successfully', {
            imageUrl,
            localUri: downloadResult.uri,
            size: fileInfo.size,
          });
          return downloadResult.uri;
        } else {
          logger.error('general', 'Downloaded file is empty', { fileInfo });
          return null;
        }
      } else {
        logger.error('general', 'Downloaded file does not exist', { fileInfo });
        return null;
      }
    }

    logger.warn('general', 'Image download returned non-200 status', {
      status: downloadResult.status,
      statusText: downloadResult.headers,
      imageUrl,
    });
    return null;
  } catch (error: any) {
    logger.error('general', 'Failed to download image for sharing', {
      error: error.message,
      stack: error.stack,
      imageUrl,
    });
    return null;
  }
}

/**
 * Share to specific app with image support
 * @param appId - App identifier (whatsapp, telegram, messenger, instagram)
 * @param imageUrl - Optional image URL to include
 * @param shareData - Share data with title, description, URL
 */
export async function shareToApp(
  appId: 'whatsapp' | 'telegram' | 'messenger' | 'instagram',
  imageUrl: string | null,
  shareData: ShareLinkResponse
): Promise<void> {
  try {
    const message = `${shareData.title}\n\n${shareData.description}\n\n${shareData.url}`;
    const fixedImageUrl = imageUrl ? fixStorageUrl(imageUrl) : null;

    // If no image, use text-only share
    if (!fixedImageUrl) {
      logger.info('general', `Sharing to ${appId} (text-only)`, { hasImage: false });
      await Share.share({
        title: shareData.title,
        message: message,
      });
      return;
    }

    // Download image
    logger.info('general', `Downloading image for ${appId}`, { imageUrl: fixedImageUrl });
    const localUri = await downloadImageForSharing(fixedImageUrl);

    if (!localUri) {
      logger.warn('general', 'Image download failed, sharing text only');
      await Share.share({
        title: shareData.title,
        message: message,
      });
      return;
    }

    // Use expo-sharing for file sharing
    logger.info('general', `Sharing image to ${appId}`, { localUri });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(localUri, {
        mimeType: 'image/webp',
        dialogTitle: shareData.title,
        UTI: 'public.image',
      });

      // Show message about copying text
      Alert.alert(
        '✅ Image Shared',
        'The image has been shared. You can copy the text and link from the "Copy Link" section below.',
        [{ text: 'OK' }]
      );
    } else {
      // Fallback to text share
      await Share.share({
        title: shareData.title,
        message: message,
      });
    }

    // Clean up downloaded file
    setTimeout(() => {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch((err) =>
        logger.warn('general', 'Failed to clean up app share image', { error: err })
      );
    }, 10000);
  } catch (error: any) {
    const isCancelled =
      error?.message === 'User did not share' ||
      error?.code === 'ERR_SHARING_CANCELLED' ||
      error?.message?.includes('cancel');

    if (!isCancelled) {
      logger.error('general', `Failed to share to ${appId}`, { error });
      throw error;
    }
  }
}

/**
 * Safe share wrapper with error handling
 * Falls back to text-only share if image fails
 */
export async function shareActivitySafe(
  activityId: number,
  shareData: ShareLinkResponse,
  imageUrl?: string | null
): Promise<void> {
  try {
    await shareActivityWithImage({
      activityId,
      imageUrl,
      shareData,
    });
  } catch (error: any) {
    // If error is not "User did not share", show alert
    if (error?.message !== 'User did not share') {
      Alert.alert(
        'Share Failed',
        'Failed to share activity. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }
}
