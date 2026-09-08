import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';

const STORAGE_KEY = '@racefy:navVoice:v1';

/**
 * Whether turn prompts are spoken (design "Racefy v2" → NavPreview / NavBanner
 * voice toggle).
 *
 * Defaults to on — someone who picked a route with directions generally wants
 * to be told about them — and is remembered per device, because an athlete who
 * runs with music mutes it once and means it.
 */
export function useNavVoicePref(): { voiceEnabled: boolean; toggleVoice: () => void } {
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw !== null) setVoiceEnabled(raw === 'true');
      })
      .catch((err) => logger.warn('activity', 'Failed to read nav voice pref', { error: err }));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch((err) =>
        logger.warn('activity', 'Failed to persist nav voice pref', { error: err }),
      );
      return next;
    });
  }, []);

  return { voiceEnabled, toggleVoice };
}
