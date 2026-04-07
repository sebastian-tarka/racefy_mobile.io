import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';
import * as audioCoachApi from '../services/audioCoach/api';
import type { AudioCoachSettings, AudioCoachPlanInfo } from '../types/audioCoach';
import { DEFAULT_AUDIO_COACH_SETTINGS } from '../types/audioCoach';

const STORAGE_KEY = '@racefy:audioCoach:settings';
const DEBOUNCE_MS = 500;

export interface UseAudioCoachSettingsResult {
  settings: AudioCoachSettings;
  planInfo: AudioCoachPlanInfo | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AudioCoachSettings>) => void;
  loadPlanInfo: () => Promise<void>;
}

export function useAudioCoachSettings(): UseAudioCoachSettingsResult {
  const [settings, setSettings] = useState<AudioCoachSettings>(DEFAULT_AUDIO_COACH_SETTINGS);
  const [planInfo, setPlanInfo] = useState<AudioCoachPlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load from AsyncStorage first (instant)
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AudioCoachSettings;
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      // Then fetch from server and merge
      try {
        const serverSettings = await audioCoachApi.fetchSettings();
        setSettings(serverSettings);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings));
      } catch (err) {
        logger.debug('audioCoach', 'Server settings fetch failed, using cached', { error: err });
      }
    } catch (err) {
      logger.error('audioCoach', 'Failed to load settings', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<AudioCoachSettings>) => {
    // Immediate local update
    setSettings(prev => {
      const next = { ...prev, ...partial };
      // Persist to AsyncStorage immediately
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err => {
        logger.error('audioCoach', 'Failed to save settings locally', { error: err });
      });
      return next;
    });

    // Debounced server sync
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(async () => {
      try {
        const serverSettings = await audioCoachApi.updateSettings(partial);
        setSettings(serverSettings);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverSettings));
      } catch (err) {
        logger.error('audioCoach', 'Failed to sync settings to server', { error: err });
      }
    }, DEBOUNCE_MS);
  }, []);

  const loadPlanInfo = useCallback(async () => {
    try {
      const info = await audioCoachApi.fetchPlanInfo();
      setPlanInfo(info);
    } catch (err) {
      logger.error('audioCoach', 'Failed to load plan info', { error: err });
    }
  }, []);

  return {
    settings,
    planInfo,
    isLoading,
    loadSettings,
    updateSettings,
    loadPlanInfo,
  };
}
