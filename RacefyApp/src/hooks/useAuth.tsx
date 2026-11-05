import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import { clearUserScopedStorage } from '../services/sessionTeardown';
import { pushNotificationService } from '../services/pushNotifications';
import { getConsentStatus } from '../services/legal';
import { changeLanguage } from '../i18n';
import { syncUnitsPreference } from './useUnits';
import { syncMapStylePreference } from './useMapStyle';
import { logger } from '../services/logger';
import { getDeviceTimeZone } from '../utils/timezone';
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutFromGoogle,
} from '../services/googleSignIn';
import { IMPERSONATION_SESSION_KEY, useImpersonationActions } from './useImpersonationActions';
import { revenueCatLogIn, revenueCatLogOut } from '../services/revenuecat';
import {
  setActiveActivityId,
  stopBackgroundLocationTracking,
} from '../services/backgroundLocation';
import * as trackingDb from '../services/trackingDb';
import type { ImpersonationSession, LoginRequest, RegisterRequest, User } from '../types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresConsent: boolean;
  isImpersonating: boolean;
  impersonatedUser: User | null;
  impersonationSession: ImpersonationSession | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkConsentStatus: () => Promise<void>;
  setConsentComplete: () => void;
  startImpersonation: (userId: number) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresConsent, setRequiresConsent] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(
    null,
  );
  const [originalAdminToken, setOriginalAdminToken] = useState<string | null>(null);

  const { startImpersonation, stopImpersonation, restoreAdminToken, clearImpersonationState } =
    useImpersonationActions(
      { user, originalAdminToken },
      {
        setUser,
        setIsImpersonating,
        setImpersonatedUser,
        setImpersonationSession,
        setOriginalAdminToken,
      },
    );

  // Check if user has accepted all required consents
  const checkConsentStatus = useCallback(async () => {
    try {
      const status = await getConsentStatus();
      setRequiresConsent(!status.accepted);
    } catch (error) {
      logger.warn('auth', 'Failed to check consent status', { error });
      // On error, assume consent is not required to avoid blocking user
      setRequiresConsent(false);
    }
  }, []);

  // Called after user accepts consents in ConsentModal
  const setConsentComplete = useCallback(() => {
    setRequiresConsent(false);
  }, []);

  // Sync language and units preferences from server
  async function syncPreferences() {
    try {
      const prefs = await api.getPreferences();
      if (prefs.language) {
        await changeLanguage(prefs.language);
      }
      if (prefs.units) {
        await syncUnitsPreference(prefs.units);
      }
      // map_style is always present (server merges defaults); null = system default.
      await syncMapStylePreference(prefs.map_style ?? null);
    } catch (error) {
      // Ignore errors - local preferences will be used
      logger.warn('auth', 'Failed to sync preferences', { error });
    }
  }

  /**
   * End the session on this device, whatever started it: explicit logout or a 401.
   * One routine, so neither path forgets a step. Every step is best effort and
   * independent — a phone without network or a failing SDK must still end up on
   * the login screen with nothing of the previous account left behind:
   *  - the GPS session in progress and its background task;
   *  - every token (auth, impersonation, admin) — logging out while impersonating
   *    used to leave the admin token behind, and the next launch restored the admin;
   *  - user-scoped AsyncStorage (caches, gym session, buffers) and persisted logs;
   *  - the Google and RevenueCat identities and the push service state.
   * Undelivered activities in the SQLite outbox stay, tagged with their owner.
   */
  const teardownLocalSession = useCallback(async () => {
    try {
      const session = trackingDb.getActiveSession();
      if (session) {
        const pending = trackingDb.countUnsynced(session.clientActivityId);
        if (pending > 0) {
          logger.warn(
            'gps',
            'Session ended with unsynced GPS points — discarding tracked session',
            {
              pendingPoints: pending,
            },
          );
        }
        // Drop the session so a future login (possibly another user) can't
        // upload these points to a stale activity.
        trackingDb.discardSession(session.clientActivityId);
      }
      await stopBackgroundLocationTracking();
      await setActiveActivityId(null);
    } catch (error) {
      logger.warn('gps', 'Failed to tear down background tracking', { error });
    }

    try {
      await api.clearToken();
      await clearImpersonationState();
      await secureStorage.clearAllTokens();
    } catch (error) {
      logger.error('auth', 'Failed to clear tokens', { error });
    }

    await clearUserScopedStorage();
    await logger.clearLogs();

    await signOutFromGoogle().catch((error) =>
      logger.warn('auth', 'Google sign-out failed', { error }),
    );
    await revenueCatLogOut().catch((error) =>
      logger.warn('auth', 'RevenueCat log-out failed', { error }),
    );
    pushNotificationService.reset();

    setUser(null);
    setRequiresConsent(false);
  }, [clearImpersonationState]);

  // The 401 callback is registered once (see the effect below) and must stay stable,
  // so it reads the current impersonation state through refs.
  const impersonationRef = useRef({ isImpersonating, originalAdminToken });
  impersonationRef.current = { isImpersonating, originalAdminToken };
  const teardownRef = useRef(teardownLocalSession);
  teardownRef.current = teardownLocalSession;
  const restoreAdminRef = useRef(restoreAdminToken);
  restoreAdminRef.current = restoreAdminToken;
  const unauthorizedInFlight = useRef(false);

  /**
   * 401: the token in use is dead. While impersonating that is usually the
   * impersonation token expiring — go back to the admin (same as "stop
   * impersonation"). Otherwise, or when the admin token is dead too, end the
   * session completely. Concurrent 401s (several requests in flight) run this once.
   */
  const handleUnauthorized = useCallback(() => {
    if (unauthorizedInFlight.current) return;
    unauthorizedInFlight.current = true;
    void (async () => {
      try {
        const { isImpersonating: impersonating, originalAdminToken: adminToken } =
          impersonationRef.current;
        if (impersonating && adminToken) {
          logger.auth('Impersonation token rejected, returning to the admin account');
          try {
            await restoreAdminRef.current(adminToken);
            return;
          } catch (error) {
            logger.warn('auth', 'Could not return to the admin account, ending session', {
              error,
            });
          }
        }
        logger.auth('Session expired, logging out user');
        await teardownRef.current();
      } finally {
        unauthorizedInFlight.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    // Set up the unauthorized callback before initializing
    api.setOnUnauthorized(handleUnauthorized);
    api.setOnUpgradeRequired((data) => {
      // Lazy import to avoid circular dependency
      const { upgradePromptEmitter } = require('../services/upgradePromptEmitter');
      upgradePromptEmitter.emit('show', {
        feature: data.feature,
        currentTier: data.currentTier,
      });
    });
    // Global rate limit (429) toast — debounced via local flag to avoid multiple alerts
    let rateLimitAlertActive = false;
    api.setOnRateLimit(() => {
      if (rateLimitAlertActive) return;
      rateLimitAlertActive = true;
      // Lazy import to keep this hook framework-agnostic
      const { Alert } = require('react-native');
      const i18n = require('../i18n').default;
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('common.rateLimited'),
        [
          {
            text: i18n.t('common.ok'),
            onPress: () => {
              rateLimitAlertActive = false;
            },
          },
        ],
        {
          onDismiss: () => {
            rateLimitAlertActive = false;
          },
        },
      );
    });
    initAuth();
  }, [handleUnauthorized]);

  async function initAuth() {
    logger.auth('Initializing authentication');
    try {
      // Configure Google Sign-In early so it's ready when needed
      configureGoogleSignIn();
      await api.init(); // Loads token from secure storage (could be impersonation or admin token)

      // Check if we have impersonation state (tokens in secure storage, session metadata in AsyncStorage)
      const impersonationToken = await secureStorage.getImpersonationToken();
      const originalToken = await secureStorage.getAdminToken();
      const sessionData = await AsyncStorage.getItem(IMPERSONATION_SESSION_KEY);

      if (impersonationToken && originalToken && sessionData) {
        logger.auth('Impersonation state found, validating session');
        // Validate session with API
        try {
          const status = await api.getImpersonationStatus();

          if (status.is_impersonating && status.session) {
            // Valid impersonation session - restore state
            logger.auth('Valid impersonation session, restoring state');
            const userData = await api.getUser(); // Gets impersonated user
            setUser(userData);
            setIsImpersonating(true);
            setImpersonatedUser(userData);
            setImpersonationSession(status.session);
            setOriginalAdminToken(originalToken);
          } else {
            // Session expired or invalid - restore admin token
            logger.auth('Impersonation session expired, restoring admin token');
            await restoreAdminToken(originalToken);
          }
        } catch (error) {
          logger.error('auth', 'Failed to validate impersonation session', { error });
          await restoreAdminToken(originalToken);
        }
      } else if (api.isAuthenticated()) {
        // Normal authenticated user (not impersonating)
        logger.auth('Token found, fetching user');
        const userData = await api.getUser();
        setUser(userData);
        logger.auth('User authenticated', { userId: userData.id, username: userData.username });
        revenueCatLogIn(userData.id).catch(() => {});
        // Sync language preference from server after auth
        syncPreferences();
        // Check consent status for existing authenticated users
        const status = await getConsentStatus();
        setRequiresConsent(!status.accepted);
        // Register for push notifications (non-blocking)
        pushNotificationService.registerWithBackend().catch((error) => {
          logger.warn('auth', 'Failed to register for push notifications during init', { error });
        });
      } else {
        logger.auth('No token found, user not authenticated');
      }
    } catch (error) {
      logger.error('auth', 'Auth initialization failed', { error });
      await api.clearToken();
      await clearImpersonationState();
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (data: LoginRequest) => {
    logger.auth('Login attempt', { email: data.email });
    const timezone = getDeviceTimeZone();
    const response = await api.login({ ...data, ...(timezone && { timezone }) });
    // Check consent BEFORE setUser to avoid briefly showing main app to users who haven't consented
    const status = await getConsentStatus();
    // Set both atomically - React 18 batches these (no await between them)
    setRequiresConsent(!status.accepted);
    setUser(response.user);
    logger.auth('Login successful', { userId: response.user.id, username: response.user.username });
    syncPreferences();
    revenueCatLogIn(response.user.id).catch(() => {});
    pushNotificationService.registerWithBackend().catch((error) => {
      logger.warn('auth', 'Failed to register for push notifications after login', { error });
    });
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    logger.auth('Registration attempt', { email: data.email, name: data.name });
    const response = await api.register(data);
    setUser(response.user);
    logger.auth('Registration successful', { userId: response.user.id });
    revenueCatLogIn(response.user.id).catch(() => {});
    // New users always need to accept consents
    setRequiresConsent(true);
    // Register for push notifications (non-blocking)
    pushNotificationService.registerWithBackend().catch((error) => {
      logger.warn('auth', 'Failed to register for push notifications after register', { error });
    });
  }, []);

  const googleSignIn = useCallback(async () => {
    logger.auth('Google Sign-In attempt');
    const idToken = await signInWithGoogle();
    const response = await api.googleAuth(idToken);
    // Check consent BEFORE setUser to avoid briefly showing main app to users who haven't consented
    let needsConsent = false;
    if (response.is_new_user) {
      needsConsent = true;
    } else {
      const status = await getConsentStatus();
      needsConsent = !status.accepted;
    }
    // Set both atomically - React 18 batches these (no await between them)
    setRequiresConsent(needsConsent);
    setUser(response.user);
    logger.auth('Google Sign-In successful', {
      userId: response.user.id,
      username: response.user.username,
      isNewUser: response.is_new_user,
    });
    revenueCatLogIn(response.user.id).catch(() => {});
    syncPreferences();
    pushNotificationService.registerWithBackend().catch((error) => {
      logger.warn('auth', 'Failed to register for push notifications after Google sign-in', {
        error,
      });
    });
  }, []);

  const logout = useCallback(async () => {
    logger.auth('Logout');
    // Unregister from push notifications while the token is still valid.
    try {
      await pushNotificationService.unregisterFromBackend();
    } catch (error) {
      logger.warn('auth', 'Failed to unregister from push notifications during logout', { error });
    }

    // Revoke the token server-side. Offline or on a server error this fails — the
    // local teardown below must still run to the end, so the failure is only logged.
    try {
      await api.logout();
    } catch (error) {
      logger.warn('auth', 'Server logout failed, ending the session locally', { error });
    }

    await teardownLocalSession();
    logger.auth('User logged out');
  }, [teardownLocalSession]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getUser();
      logger.debug('auth', 'refreshUser subscription data', {
        tier: userData.subscription?.tier,
        is_premium: userData.subscription?.is_premium,
        features: userData.subscription?.features,
      });
      setUser(userData);
    } catch {
      // Ignore errors
    }
  }, []);

  // Memoized so the many consumers re-render only when auth state actually changes.
  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      requiresConsent,
      isImpersonating,
      impersonatedUser,
      impersonationSession,
      login,
      register,
      googleSignIn,
      logout,
      refreshUser,
      checkConsentStatus,
      setConsentComplete,
      startImpersonation,
      stopImpersonation,
    }),
    [
      user,
      isLoading,
      requiresConsent,
      isImpersonating,
      impersonatedUser,
      impersonationSession,
      login,
      register,
      googleSignIn,
      logout,
      refreshUser,
      checkConsentStatus,
      setConsentComplete,
      startImpersonation,
      stopImpersonation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
