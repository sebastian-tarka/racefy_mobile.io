import Constants from 'expo-constants';

/**
 * Feature flags configuration.
 * Read from app.config.ts extra field (loaded from .env).
 */

const extra = Constants.expoConfig?.extra ?? {};

/**
 * Use the new dynamic (config-based) Home screen.
 *
 * When true: Uses DynamicHomeScreen which renders based on /home/config endpoint
 * When false: Uses original HomeScreen with hardcoded layout
 *
 * Set via USE_DYNAMIC_HOME environment variable.
 */
export const USE_DYNAMIC_HOME: boolean = extra.useDynamicHome === true;
