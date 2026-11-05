import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { api } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import { clearUserScopedStorage } from '../services/sessionTeardown';
import { logger } from '../services/logger';
import type { User, ImpersonationSession } from '../types/api';

export const IMPERSONATION_SESSION_KEY = '@racefy_impersonation_session';

/**
 * What is persisted about an impersonation session, in plain AsyncStorage. Only
 * identifiers: the tokens live in SecureStore, and the impersonated user is
 * fetched again from the API on start-up. Never store `StartImpersonationResponse`
 * itself here — it carries the bearer token and the user's e-mail.
 */
interface StoredImpersonationSession {
  session_id: number;
  expires_at: string;
  impersonated_user_id: number;
}

interface ImpersonationState {
  user: User | null;
  originalAdminToken: string | null;
}

interface ImpersonationSetters {
  setUser: (user: User | null) => void;
  setIsImpersonating: (value: boolean) => void;
  setImpersonatedUser: (user: User | null) => void;
  setImpersonationSession: (session: ImpersonationSession | null) => void;
  setOriginalAdminToken: (token: string | null) => void;
}

/**
 * Handles admin impersonation actions.
 * Extracted from AuthProvider to keep auth context focused on core auth flow.
 */
export function useImpersonationActions(state: ImpersonationState, setters: ImpersonationSetters) {
  const { user, originalAdminToken } = state;
  const {
    setUser,
    setIsImpersonating,
    setImpersonatedUser,
    setImpersonationSession,
    setOriginalAdminToken,
  } = setters;

  const clearImpersonationState = useCallback(async () => {
    await secureStorage.clearImpersonationToken();
    await secureStorage.clearAdminToken();
    await AsyncStorage.removeItem(IMPERSONATION_SESSION_KEY);
    setIsImpersonating(false);
    setImpersonatedUser(null);
    setImpersonationSession(null);
    setOriginalAdminToken(null);
  }, [setIsImpersonating, setImpersonatedUser, setImpersonationSession, setOriginalAdminToken]);

  const restoreAdminToken = useCallback(
    async (adminToken: string) => {
      // Reached when the impersonation ended without "stop" (expired, revoked):
      // the impersonated user's cached data must not greet the admin either.
      await clearUserScopedStorage();
      await api.setToken(adminToken);
      const adminData = await api.getUser();
      setUser(adminData);
      await clearImpersonationState();
    },
    [setUser, clearImpersonationState],
  );

  const startImpersonation = useCallback(
    async (userId: number) => {
      logger.auth('Starting impersonation', { userId });
      try {
        const adminToken = api.getToken();
        if (!adminToken) throw new Error('Not authenticated');

        const response = await api.startImpersonation(userId);

        await secureStorage.setAdminToken(adminToken);
        await secureStorage.setImpersonationToken(response.impersonation_token);
        const stored: StoredImpersonationSession = {
          session_id: response.session_id,
          expires_at: response.expires_at,
          impersonated_user_id: response.impersonated_user.id,
        };
        await AsyncStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(stored));

        await api.setToken(response.impersonation_token);

        // The account context changes: drop the admin's cached data and session state.
        await clearUserScopedStorage();

        // Fetch full user data (with subscription/plan) using the impersonation token
        const fullUserData = await api.getUser();
        logger.auth('Fetched full impersonated user data', {
          userId: fullUserData.id,
          tier: fullUserData.subscription?.tier,
        });

        setImpersonatedUser(fullUserData);
        setUser(fullUserData);
        setIsImpersonating(true);
        setImpersonationSession({
          id: response.session_id,
          admin_id: user!.id,
          impersonated_user_id: fullUserData.id,
          started_at: response.expires_at,
          expires_at: response.expires_at,
          ended_at: null,
        });
        setOriginalAdminToken(adminToken);
        logger.auth('Impersonation started', {
          impersonatedUserId: fullUserData.id,
          impersonatedUsername: fullUserData.username,
        });
      } catch (error) {
        logger.error('auth', 'Failed to start impersonation', { error });
        throw error;
      }
    },
    [
      user,
      setUser,
      setIsImpersonating,
      setImpersonatedUser,
      setImpersonationSession,
      setOriginalAdminToken,
    ],
  );

  const stopImpersonation = useCallback(async () => {
    logger.auth('Stopping impersonation');
    try {
      await api.stopImpersonation();

      // Back to the admin's context: drop the impersonated user's cached data.
      await clearUserScopedStorage();

      if (originalAdminToken) {
        await api.setToken(originalAdminToken);
        // Fetch full admin user data (with subscription/plan)
        const fullAdminData = await api.getUser();
        setUser(fullAdminData);
        logger.auth('Impersonation stopped, restored to admin', {
          adminUserId: fullAdminData.id,
          adminUsername: fullAdminData.username,
        });
      }

      await clearImpersonationState();
    } catch (error) {
      logger.error('auth', 'Failed to stop impersonation', { error });
      // Clear cached data even on error
      await clearUserScopedStorage();
      if (originalAdminToken) {
        await api.setToken(originalAdminToken);
        const adminData = await api.getUser();
        setUser(adminData);
      }
      await clearImpersonationState();
      throw error;
    }
  }, [originalAdminToken, setUser, clearImpersonationState]);

  return {
    startImpersonation,
    stopImpersonation,
    restoreAdminToken,
    clearImpersonationState,
  };
}
