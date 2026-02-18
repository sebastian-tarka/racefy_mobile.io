import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';
import { api } from '../services/api';
import { secureStorage } from '../services/secureStorage';
import { logger } from '../services/logger';
import type { User, ImpersonationSession } from '../types/api';

export const IMPERSONATION_SESSION_KEY = '@racefy_impersonation_session';

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
export function useImpersonationActions(
  state: ImpersonationState,
  setters: ImpersonationSetters
) {
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

  const restoreAdminToken = useCallback(async (adminToken: string) => {
    await api.setToken(adminToken);
    const adminData = await api.getUser();
    setUser(adminData);
    await clearImpersonationState();
  }, [setUser, clearImpersonationState]);

  const startImpersonation = useCallback(async (userId: number) => {
    logger.auth('Starting impersonation', { userId });
    try {
      const adminToken = api.getToken();
      if (!adminToken) throw new Error('Not authenticated');

      const response = await api.startImpersonation(userId);

      await secureStorage.setAdminToken(adminToken);
      await secureStorage.setImpersonationToken(response.impersonation_token);
      await AsyncStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify(response));

      await api.setToken(response.impersonation_token);

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
        impersonatedUsername: response.impersonated_user.username,
      });
    } catch (error) {
      logger.error('auth', 'Failed to start impersonation', { error });
      throw error;
    }
  }, [user, setUser, setIsImpersonating, setImpersonatedUser, setImpersonationSession, setOriginalAdminToken]);

  const stopImpersonation = useCallback(async () => {
    logger.auth('Stopping impersonation');
    try {
      const response = await api.stopImpersonation();

      if (originalAdminToken) {
        await api.setToken(originalAdminToken);
        setUser(response.admin_user);
        logger.auth('Impersonation stopped, restored to admin', {
          adminUserId: response.admin_user.id,
          adminUsername: response.admin_user.username,
        });
      }

      await clearImpersonationState();
    } catch (error) {
      logger.error('auth', 'Failed to stop impersonation', { error });
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
