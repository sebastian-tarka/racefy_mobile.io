import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { logger } from './logger';

let isConfigured = false;

/**
 * Configure Google Sign-In with client IDs from Expo config.
 * Should be called once at app startup.
 */
export function configureGoogleSignIn(): void {
  if (isConfigured) return;

  const extra = Constants.expoConfig?.extra;
  const webClientId = extra?.googleWebClientId || '';
  const iosClientId = extra?.googleIosClientId || '';

  if (!webClientId) {
    logger.warn('auth', 'Google Sign-In: GOOGLE_WEB_CLIENT_ID not configured');
    return;
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });

  isConfigured = true;
  logger.info('auth', 'Google Sign-In configured');
}

/**
 * Perform Google Sign-In and return the ID token.
 * Throws if sign-in fails or is cancelled.
 */
export async function signInWithGoogle(): Promise<string> {
  if (!isConfigured) {
    configureGoogleSignIn();
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('No ID token received from Google Sign-In');
  }

  return idToken;
}

/**
 * Sign out from Google to clear cached session.
 * Should be called during app logout.
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    logger.warn('auth', 'Google Sign-Out failed', { error });
  }
}

/**
 * Check if Google Sign-In is available (configured with client IDs).
 */
export function isGoogleSignInAvailable(): boolean {
  const extra = Constants.expoConfig?.extra;
  return !!extra?.googleWebClientId;
}

export { statusCodes };
