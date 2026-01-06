import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { api } from '../services/api';
import { getConsentStatus } from '../services/legal';
import { changeLanguage } from '../i18n';
import { logger } from '../services/logger';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresConsent: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkConsentStatus: () => Promise<void>;
  setConsentComplete: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresConsent, setRequiresConsent] = useState(false);

  // Check if user has accepted all required consents
  const checkConsentStatus = useCallback(async () => {
    try {
      const status = await getConsentStatus();
      setRequiresConsent(!status.accepted);
    } catch (error) {
      console.log('Failed to check consent status:', error);
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
      console.log('Failed to sync language preference:', error);
    }
  }

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    logger.auth('Initializing authentication');
    try {
      await api.init();
      if (api.isAuthenticated()) {
        logger.auth('Token found, fetching user');
        const userData = await api.getUser();
        setUser(userData);
        logger.auth('User authenticated', { userId: userData.id, username: userData.username });
        // Sync language preference from server after auth
        syncLanguagePreference();
        // Check consent status for existing authenticated users
        const status = await getConsentStatus();
        setRequiresConsent(!status.accepted);
      } else {
        logger.auth('No token found, user not authenticated');
      }
    } catch (error) {
      logger.error('auth', 'Auth initialization failed', { error });
      await api.clearToken();
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
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    logger.auth('Registration attempt', { email: data.email, name: data.name });
    const response = await api.register(data);
    setUser(response.user);
    logger.auth('Registration successful', { userId: response.user.id });
    // New users always need to accept consents
    setRequiresConsent(true);
  }, []);

  const logout = useCallback(async () => {
    logger.auth('Logout');
    await api.logout();
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        requiresConsent,
        login,
        register,
        logout,
        refreshUser,
        checkConsentStatus,
        setConsentComplete,
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
