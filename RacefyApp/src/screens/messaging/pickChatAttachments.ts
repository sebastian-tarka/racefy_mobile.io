import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { logger } from '../../services/logger';
import { getFilename, getImageMimeType } from '../../utils/mime';
import { pickImages } from '../../utils/pickImages';
import {
  MAX_ATTACHMENTS,
  documentMimeType,
  type LocalAttachment,
} from '../../utils/chatAttachments';

/** Longest side after downscaling; keeps a phone photo well under the 10 MB limit. */
const MAX_IMAGE_SIDE = 2048;
const JPEG_QUALITY = 0.85;

let nextLocalId = 1;
const localId = () => `local-${Date.now()}-${nextLocalId++}`;

async function fileSize(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
}

/**
 * Downscales a picked photo to at most 2048 px on its longer side and re-encodes it as
 * JPEG. Falls back to the original when the manipulator fails (the size check and the
 * server still guard the limit).
 */
async function prepareImage(picked: {
  uri: string;
  width: number;
  height: number;
}): Promise<LocalAttachment> {
  let { uri, width, height } = picked;
  const longest = Math.max(width, height);
  try {
    const context = ImageManipulator.manipulate(uri);
    if (longest > MAX_IMAGE_SIDE) {
      const scale = MAX_IMAGE_SIDE / longest;
      context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    uri = saved.uri;
    width = saved.width;
    height = saved.height;
    rendered.release();
  } catch (error) {
    logger.warn('general', 'Chat photo downscale failed, sending the original', { error });
  }
  const name = getFilename(uri, 'photo.jpg');
  return {
    localId: localId(),
    kind: 'image',
    uri,
    name: /\.(jpe?g|png|webp)$/i.test(name) ? name : `${name}.jpg`,
    mimeType: getImageMimeType(uri),
    size: await fileSize(uri),
    width,
    height,
  };
}

/** Gallery (several) or camera (one) photos, downscaled. Empty when cancelled or denied. */
export async function pickChatImages(
  source: 'library' | 'camera',
  room: number = MAX_ATTACHMENTS,
): Promise<LocalAttachment[]> {
  const picked = await pickImages({
    source,
    multiple: source === 'library',
    selectionLimit: Math.max(1, room),
  });
  const prepared: LocalAttachment[] = [];
  for (const image of picked) prepared.push(await prepareImage(image));
  return prepared;
}

/**
 * One document from the system picker. All types are offered on purpose: Android does
 * not know `application/gpx+xml` for most files, so the picker would hide GPX tracks;
 * `validateAttachments` rejects anything that is not PDF/GPX by extension.
 */
export async function pickChatDocument(): Promise<LocalAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/gpx+xml', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((asset) => ({
    localId: localId(),
    kind: 'file' as const,
    uri: asset.uri,
    name: asset.name,
    mimeType: documentMimeType(asset.name, asset.mimeType),
    size: typeof asset.size === 'number' ? asset.size : null,
  }));
}
