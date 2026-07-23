import { useCallback, useEffect, useState } from 'react';
import type { AudioFocusPrefs } from '../services/audioCoach/audioSession';
import {
  DEFAULT_AUDIO_FOCUS_PREFS,
  getAudioFocusPrefs,
  loadAudioFocusPrefs,
  setAudioFocusPrefs,
} from '../services/audioCoach/audioSession';

export interface UseAudioFocusPrefsResult {
  prefs: AudioFocusPrefs;
  updatePrefs: (partial: Partial<AudioFocusPrefs>) => void;
}

/**
 * How announcements behave against other apps' audio (Spotify, podcasts).
 *
 * Deliberately device-local and NOT part of the server-synced audio coach
 * settings: it depends on the headphones and music app in use, not on the
 * account, and the background location task must be able to read it from
 * AsyncStorage without an API call.
 */
export function useAudioFocusPrefs(): UseAudioFocusPrefsResult {
  const [prefs, setPrefs] = useState<AudioFocusPrefs>(
    () => getAudioFocusPrefs() ?? DEFAULT_AUDIO_FOCUS_PREFS,
  );

  useEffect(() => {
    let cancelled = false;
    loadAudioFocusPrefs().then((loaded) => {
      if (!cancelled) setPrefs(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback((partial: Partial<AudioFocusPrefs>) => {
    // Optimistic: setAudioFocusPrefs sanitizes and persists, and applying the
    // new session mode is what makes the next preview audibly different.
    setPrefs((prev) => ({ ...prev, ...partial }));
    void setAudioFocusPrefs(partial).then(() => setPrefs(getAudioFocusPrefs()));
  }, []);

  return { prefs, updatePrefs };
}
