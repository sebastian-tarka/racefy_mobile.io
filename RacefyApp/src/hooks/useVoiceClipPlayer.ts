import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

import { logger } from '../services/logger';
import { getErrorMessage } from '../utils/errors';

/**
 * Whatever clip is playing right now, anywhere in the app. Two cheers playing
 * over each other in a list is never what anyone wants, so starting one stops
 * the previous one.
 */
let stopCurrent: (() => Promise<void>) | null = null;

interface Result {
  isPlaying: boolean;
  isLoading: boolean;
  /** Play from the start, or stop if playing. No-op without a uri. */
  toggle: () => Promise<void>;
}

/**
 * Inline play/stop for one voice clip — a signed `audio_url` or a local
 * recording. Meant for lists and previews, where a clip is a few seconds and
 * seeking would be overkill.
 */
export function useVoiceClipPlayer(uri: string | null | undefined): Result {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const release = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setIsPlaying(false);
    if (stopCurrent === releaseRef.current) stopCurrent = null;
    if (sound) await sound.unloadAsync().catch(() => {});
  }, []);
  // `release` is stable, but the module-level slot needs the same identity to compare against.
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const toggle = useCallback(async () => {
    if (soundRef.current) {
      await release();
      return;
    }
    if (!uri) return;

    if (stopCurrent) await stopCurrent();
    setIsLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      stopCurrent = releaseRef.current;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) void release();
      });
    } catch (error) {
      logger.warn('live', 'Voice clip playback failed', { error: getErrorMessage(error) });
      await release();
    } finally {
      setIsLoading(false);
    }
  }, [uri, release]);

  // A new uri (list re-render with a fresh signed url) or unmount drops the player.
  useEffect(
    () => () => {
      void release();
    },
    [uri, release],
  );

  return { isPlaying, isLoading, toggle };
}
