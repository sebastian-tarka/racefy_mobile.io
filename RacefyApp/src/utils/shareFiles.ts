import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../services/logger';

/**
 * Temporary files written to the app cache only to be handed to the share sheet:
 * a GPX track, a downloaded share image, a photo overlay. They hold where the
 * user has been, so they must not outlive the share.
 *
 * A file cannot be deleted the moment the share sheet closes — the receiving app
 * may still be reading it — so it is deleted a little later
 * ({@link discardShareFileLater}, called from `finally`: also when sharing
 * failed or was cancelled). If the app is closed before that happens,
 * {@link purgeStaleShareFiles} removes what is left on the next start.
 */

/** Every temporary share file starts with one of these — the sweep goes by name. */
const SHARE_FILE_PREFIXES = ['racefy-activity-', 'share-image-', 'racefy-overlay-'];

/** Long enough for the receiving app to copy the file after the sheet closes. */
const DISCARD_DELAY_MS = 60_000;

/** At app start anything older than this is from a share that is long over. */
const STALE_AFTER_MS = 10 * 60_000;

/** Delete a temporary share file after `delayMs` (0 — right away). Never throws. */
export function discardShareFileLater(uri: string, delayMs: number = DISCARD_DELAY_MS): void {
  const discard = () => {
    FileSystem.deleteAsync(uri, { idempotent: true }).catch((error) =>
      logger.warn('general', 'Failed to delete a temporary share file', { error }),
    );
  };
  if (delayMs <= 0) {
    discard();
  } else {
    setTimeout(discard, delayMs);
  }
}

/**
 * Delete temporary share files left in the cache by earlier runs of the app.
 * Returns how many were removed. Never throws.
 */
export async function purgeStaleShareFiles(now: number = Date.now()): Promise<number> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) return 0;

  let removed = 0;
  try {
    const names = await FileSystem.readDirectoryAsync(directory);
    for (const name of names) {
      if (!SHARE_FILE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
      const uri = `${directory}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory) continue;
      // modificationTime is in seconds; a file without one is treated as old.
      const modifiedAt = (info.modificationTime ?? 0) * 1000;
      if (now - modifiedAt < STALE_AFTER_MS) continue;
      await FileSystem.deleteAsync(uri, { idempotent: true });
      removed += 1;
    }
  } catch (error) {
    logger.warn('general', 'Could not sweep temporary share files', { error });
  }
  if (removed > 0) logger.info('general', 'Removed leftover share files', { removed });
  return removed;
}
