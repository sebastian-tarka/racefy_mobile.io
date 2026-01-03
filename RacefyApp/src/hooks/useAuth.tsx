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
    try {
      await api.init();
      if (api.isAuthenticated()) {
        const userData = await api.getUser();
        setUser(userData);
        // Sync language preference from server after auth
        syncLanguagePreference();
        // Check consent status for existing authenticated users
        const status = await getConsentStatus();
        setRequiresConsent(!status.accepted);
      }
    } catch (error) {
      await api.clearToken();
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (data: LoginRequest) => {
    const response = await api.login(data);
    console.log('Auth hook received user:', response.user);
    setUser(response.user);
    // Sync language preference after login
    syncLanguagePreference();
    // Check consent status after login
    const status = await getConsentStatus();
    setRequiresConsent(!status.accepted);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await api.register(data);
    setUser(response.user);
    // New users always need to accept consents
    setRequiresConsent(true);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setRequiresConsent(false);
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
