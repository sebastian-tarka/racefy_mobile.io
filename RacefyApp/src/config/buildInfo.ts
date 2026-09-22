import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from './api';

/**
 * Which backend / third-party projects this build talks to.
 * Shown in Settings → App so testers can tell a prod build from a stage one
 * without reading URLs. Everything is derived from the config baked in at
 * build time (app.config.ts → extra), never fetched.
 */
export type BackendTarget = 'prod' | 'stage' | 'local' | 'none';

const extra = Constants.expoConfig?.extra ?? {};

// RN's URL polyfill doesn't implement hostname reliably, so parse by hand.
const apiHost = (/^https?:\/\/([^/:?#]+)/.exec(API_BASE_URL)?.[1] ?? '').toLowerCase();

const targetForHost = (host: string): BackendTarget => {
  if (host === 'racefy.io') return 'prod';
  if (host === 'app.dev.racefy.io') return 'stage';
  return 'local';
};

// google-services.json / GoogleService-Info.plist path as resolved by app.config.ts:
// `-staging` suffix = Firebase app registered for com.racefy.app.staging.
const googleServicesFile: string | undefined =
  Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.googleServicesFile
    : Constants.expoConfig?.android?.googleServicesFile;

const firebaseTarget: BackendTarget = !googleServicesFile
  ? 'none'
  : googleServicesFile.includes('-staging')
    ? 'stage'
    : 'prod';

// Google OAuth client IDs look like `<project-number>-<hash>.apps.googleusercontent.com`;
// the project number is enough to tell which Cloud project the build is wired to.
const googleWebClientId: string = extra.googleWebClientId || '';
const googleProjectNumber: string | null = googleWebClientId
  ? (googleWebClientId.split('-')[0] ?? null)
  : null;

export const buildInfo = {
  /** Backend the API client is pointed at. */
  apiTarget: targetForHost(apiHost),
  apiHost,
  /** `production` or `staging` app identity (bundle ID, scheme, icon). */
  appVariant: (extra.appVariant as 'production' | 'staging' | undefined) ?? 'production',
  /** Which Firebase app the push config file belongs to. */
  firebaseTarget,
  /** Google Cloud project number behind Google Sign-In, or null when disabled. */
  googleProjectNumber,
} as const;
