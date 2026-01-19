import Constants from 'expo-constants';

/**
 * Feature flags configuration.
 * Read from app.config.ts extra field (loaded from .env).
 */

const extra = Constants.expoConfig?.extra ?? {};

/**
 * @deprecated This env variable is no longer used.
 * Home screen version is now controlled by the API via `home_version` field
 * in /home and /home/config endpoints.
 *
 * The HomeScreenWrapper component reads `home_version` from the API response
 * and renders either legacy HomeScreen or DynamicHomeScreen accordingly.
 *
 * This allows the backend to control which home experience users see,
 * enabling gradual rollout, A/B testing, or per-user customization
 * without requiring app updates.
 */
export const USE_DYNAMIC_HOME: boolean = extra.useDynamicHome === true;
