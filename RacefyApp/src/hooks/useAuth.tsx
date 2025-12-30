import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { api } from '../services/api';
import { changeLanguage } from '../i18n';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await api.register(data);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
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
        login,
        register,
        logout,
        refreshUser,
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
