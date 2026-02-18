/**
 * MIME type detection utilities for file uploads.
 * Single source of truth — replaces inline ext→mime logic duplicated across api.ts.
 */

/**
 * Returns the MIME type for an image file based on its URI/filename extension.
 * Defaults to 'image/jpeg' for unknown extensions.
 */
export function getImageMimeType(uri: string): string {
  const filename = uri.split('/').pop() ?? '';
  const match = /\.(\w+)$/.exec(filename);
  if (!match) return 'image/jpeg';

  switch (match[1].toLowerCase()) {
    case 'png':  return 'image/png';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic':
    case 'heif': return 'image/heic';
    default:     return 'image/jpeg';
  }
}

/**
 * Returns the MIME type for a video file based on its URI/filename extension.
 * Defaults to 'video/mp4' for unknown extensions.
 */
export function getVideoMimeType(uri: string): string {
  const filename = uri.split('/').pop() ?? '';
  const match = /\.(\w+)$/.exec(filename);
  if (!match) return 'video/mp4';

  switch (match[1].toLowerCase()) {
    case 'mp4':  return 'video/mp4';
    case 'mov':  return 'video/quicktime';
    case 'avi':  return 'video/x-msvideo';
    case 'webm': return 'video/webm';
    default:     return 'video/mp4';
  }
}

/**
 * Returns MIME type for any media file (image or video).
 * Pass mediaType = 'video' for video files, otherwise treated as image.
 */
export function getMediaMimeType(uri: string, mediaType: 'image' | 'video' = 'image'): string {
  return mediaType === 'video' ? getVideoMimeType(uri) : getImageMimeType(uri);
}

/**
 * Extracts the filename from a URI/path.
 */
export function getFilename(uri: string, fallback = 'file'): string {
  return uri.split('/').pop() || fallback;
}
