import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';

const HAPTICS_ENABLED_KEY = '@racefy_haptics_enabled';

// Global state for non-hook usage (e.g., in Button component)
let globalHapticsEnabled = true;

interface UseHapticsResult {
  isEnabled: boolean;
  isSupported: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  impact: (style?: Haptics.ImpactFeedbackStyle) => void;
  notification: (type?: Haptics.NotificationFeedbackType) => void;
  selection: () => void;
}

// Check if device supports haptics
const checkHapticsSupport = (): boolean => {
  // iOS devices with Taptic Engine (iPhone 7+) support haptics
  // Android devices with vibration motor support haptics
  // expo-haptics handles this internally, but we can assume support on both platforms
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

export function useHaptics(): UseHapticsResult {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSupported] = useState(checkHapticsSupport);

  // Load saved preference and sync with global
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
        if (saved !== null) {
          const enabled = saved === 'true';
          setIsEnabled(enabled);
          // Sync with global variable
          globalHapticsEnabled = enabled;
        }
      } catch (error) {
        logger.error('general', 'Failed to load haptics preference', { error });
      }
    };
    loadPreference();
  }, []);

  // Save preference and update global state
  const setEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabled(enabled);
    // Also update the global variable for triggerHaptic
    globalHapticsEnabled = enabled;
    try {
      await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
    } catch (error) {
      logger.error('general', 'Failed to save haptics preference', { error });
    }
  }, []);

  // Impact feedback (for button presses)
  const impact = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
      if (isEnabled && isSupported) {
        Haptics.impactAsync(style);
      }
    },
    [isEnabled, isSupported]
  );

  // Notification feedback (for success/warning/error)
  const notification = useCallback(
    (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
      if (isEnabled && isSupported) {
        Haptics.notificationAsync(type);
      }
    },
    [isEnabled, isSupported]
  );

  // Selection feedback (for picker/selection changes)
  const selection = useCallback(() => {
    if (isEnabled && isSupported) {
      Haptics.selectionAsync();
    }
  }, [isEnabled, isSupported]);

  return {
    isEnabled,
    isSupported,
    setEnabled,
    impact,
    notification,
    selection,
  };
}

// Update global variable directly (used by hook)
export const updateGlobalHapticsEnabled = (enabled: boolean): void => {
  globalHapticsEnabled = enabled;
};

export const loadGlobalHapticsPreference = async (): Promise<void> => {
  try {
    const saved = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
    if (saved !== null) {
      globalHapticsEnabled = saved === 'true';
    }
  } catch (error) {
    logger.error('general', 'Failed to load haptics preference', { error });
  }
};

export const triggerHaptic = (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light
): void => {
  if (globalHapticsEnabled && checkHapticsSupport()) {
    Haptics.impactAsync(style);
  }
};

export const setGlobalHapticsEnabled = async (enabled: boolean): Promise<void> => {
  globalHapticsEnabled = enabled;
  try {
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
  } catch (error) {
    logger.error('general', 'Failed to save haptics preference', { error });
  }
};

export const isGlobalHapticsEnabled = (): boolean => globalHapticsEnabled;
