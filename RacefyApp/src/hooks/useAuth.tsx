import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import { pushNotificationService } from '../services/pushNotifications';
import { getConsentStatus } from '../services/legal';
import { changeLanguage } from '../i18n';
import { logger } from '../services/logger';
import { configureGoogleSignIn, signInWithGoogle } from '../services/googleSignIn';
import type { User, LoginRequest, RegisterRequest, ImpersonationSession } from '../types/api';

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

// AsyncStorage key for non-sensitive session metadata
const IMPERSONATION_SESSION_KEY = '@racefy_impersonation_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresConsent, setRequiresConsent] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(null);
  const [originalAdminToken, setOriginalAdminToken] = useState<string | null>(null);

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

  // Sync language preference from server to local i18n
  async function syncLanguagePreference() {
    try {
      const prefs = await api.getPreferences();
      if (prefs.language) {
        await changeLanguage(prefs.language);
      }
    } catch (error) {
      // Ignore errors - local language preference will be used
      logger.warn('auth', 'Failed to sync language preference', { error });
    }
  }

  // Handle 401 unauthorized responses by clearing user state
  const handleUnauthorized = useCallback(() => {
    logger.auth('Session expired, logging out user');
    setUser(null);
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setImpersonationSession(null);
    setOriginalAdminToken(null);
    setRequiresConsent(false);
  }, []);

  useEffect(() => {
    // Set up the unauthorized callback before initializing
    api.setOnUnauthorized(handleUnauthorized);
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
        // Sync language preference from server after auth
        syncLanguagePreference();
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
    const response = await api.login(data);
    setUser(response.user);
    logger.auth('Login successful', { userId: response.user.id, username: response.user.username });
    // Sync language preference after login
    syncLanguagePreference();
    // Check consent status after login
    const status = await getConsentStatus();
    setRequiresConsent(!status.accepted);
    // Register for push notifications (non-blocking)
    pushNotificationService.registerWithBackend().catch((error) => {
      logger.warn('auth', 'Failed to register for push notifications after login', { error });
    });
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    logger.auth('Registration attempt', { email: data.email, name: data.name });
    const response = await api.register(data);
    setUser(response.user);
    logger.auth('Registration successful', { userId: response.user.id });
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
    setUser(response.user);
    logger.auth('Google Sign-In successful', { userId: response.user.id, username: response.user.username, isNewUser: response.is_new_user });
    // Sync language preference after login
    syncLanguagePreference();
    // New users need to accept consents; existing users: check status
    if (response.is_new_user) {
      setRequiresConsent(true);
    } else {
      const status = await getConsentStatus();
      setRequiresConsent(!status.accepted);
    }
    // Register for push notifications (non-blocking)
    pushNotificationService.registerWithBackend().catch((error) => {
      logger.warn('auth', 'Failed to register for push notifications after Google sign-in', { error });
    });
  }, []);

  const logout = useCallback(async () => {
    logger.auth('Logout');
    // Unregister from push notifications before logout (non-blocking, but wait)
    try {
      await pushNotificationService.unregisterFromBackend();
    } catch (error) {
      logger.warn('auth', 'Failed to unregister from push notifications during logout', { error });
    }
    await api.logout();
    // Reset push notification service state
    pushNotificationService.reset();
    setUser(null);
    setRequiresConsent(false);
    logger.auth('User logged out');
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch (error) {
      // Ignore errors
    }
  }, []);

  // Helper function to clear impersonation state (secure tokens + session metadata)
  async function clearImpersonationState() {
    await secureStorage.clearImpersonationToken();
    await secureStorage.clearAdminToken();
    await AsyncStorage.removeItem(IMPERSONATION_SESSION_KEY);
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setImpersonationSession(null);
    setOriginalAdminToken(null);
  }

  // Helper function to restore admin token
  async function restoreAdminToken(adminToken: string) {
    await api.setToken(adminToken);
    const adminData = await api.getUser();
    setUser(adminData);
    await clearImpersonationState();
  }

  const startImpersonation = useCallback(async (userId: number) => {
    logger.auth('Starting impersonation', { userId });
    try {
      // Store original admin token
      const adminToken = api.getToken();
      if (!adminToken) throw new Error('Not authenticated');

      // Call API to start impersonation
      const response = await api.startImpersonation(userId);

      // Store tokens securely and session metadata in AsyncStorage
      await secureStorage.setAdminToken(adminToken);
      await secureStorage.setImpersonationToken(response.impersonation_token);
      await AsyncStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(response));

      // Switch to impersonation token
      await api.setToken(response.impersonation_token);

      // Update state
      setImpersonatedUser(response.impersonated_user);
      setUser(response.impersonated_user);
      setIsImpersonating(true);
      setImpersonationSession({
        id: response.session_id,
        admin_id: user!.id,
        impersonated_user_id: response.impersonated_user.id,
        started_at: response.expires_at,
        expires_at: response.expires_at,
        ended_at: null,
      });
      setOriginalAdminToken(adminToken);
      logger.auth('Impersonation started', {
        impersonatedUserId: response.impersonated_user.id,
        impersonatedUsername: response.impersonated_user.username
      });
    } catch (error) {
      logger.error('auth', 'Failed to start impersonation', { error });
      throw error;
    }
  }, [user]);

  const stopImpersonation = useCallback(async () => {
    logger.auth('Stopping impersonation');
    try {
      // Call API to end impersonation (uses impersonation token)
      const response = await api.stopImpersonation();

      // Restore admin token
      if (originalAdminToken) {
        await api.setToken(originalAdminToken);
        setUser(response.admin_user); // Set admin user from response
        logger.auth('Impersonation stopped, restored to admin', {
          adminUserId: response.admin_user.id,
          adminUsername: response.admin_user.username
        });
      }

      // Clear impersonation state
      await clearImpersonationState();
    } catch (error) {
      logger.error('auth', 'Failed to stop impersonation', { error });
      // On error, attempt to restore admin token anyway
      if (originalAdminToken) {
        await api.setToken(originalAdminToken);
        const adminData = await api.getUser();
        setUser(adminData);
      }
      await clearImpersonationState();
      throw error;
    }
  }, [originalAdminToken]);

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
