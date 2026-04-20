import {useAppConfig} from '../contexts/AppConfigContext';
import type {AppConfigFeatures} from '../types/api';

const DEFAULTS: AppConfigFeatures = {
  event_entry_fee: false,
};

/**
 * Returns feature flags from app config with safe defaults.
 * Flags are fetched once on cold start and refreshed when app returns to foreground.
 */
export function useFeatureFlags(): AppConfigFeatures {
  const { config } = useAppConfig();
  return {
    ...DEFAULTS,
    ...config?.features,
  };
}
