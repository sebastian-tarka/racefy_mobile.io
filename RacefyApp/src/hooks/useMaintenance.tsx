import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../services/api';
import { logger } from '../services/logger';

interface MaintenanceState {
  isMaintenanceMode: boolean;
  message: string | null;
  estimatedEnd: string | null;
  checkMaintenance: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceState>({
  isMaintenanceMode: false,
  message: null,
  estimatedEnd: null,
  checkMaintenance: async () => {},
});

const POLL_INTERVAL = 30000; // 30 seconds

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [estimatedEnd, setEstimatedEnd] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkMaintenance = useCallback(async () => {
    try {
      const config = await api.getAppConfig();
      const maintenance = config.maintenance;

      if (maintenance?.enabled) {
        setIsMaintenanceMode(true);
        setMessage(maintenance.message);
        setEstimatedEnd(maintenance.estimated_end);
      } else {
        setIsMaintenanceMode(false);
        setMessage(null);
        setEstimatedEnd(null);
      }
    } catch (error: any) {
      // If we get 503 with maintenance flag, enter maintenance mode
      if (error?.status === 503 && error?.maintenance) {
        setIsMaintenanceMode(true);
        setMessage(error.message || null);
        setEstimatedEnd(error.estimated_end || null);
      } else {
        logger.error('api', 'Failed to check maintenance status', { error });
      }
    }
  }, []);

  // Handle 503 responses from any API call
  const handleMaintenanceResponse = useCallback((data: { message?: string; estimated_end?: string }) => {
    setIsMaintenanceMode(true);
    setMessage(data.message || null);
    setEstimatedEnd(data.estimated_end || null);
  }, []);

  // Check on mount
  useEffect(() => {
    checkMaintenance();
  }, [checkMaintenance]);

  // Poll when in maintenance mode
  useEffect(() => {
    if (isMaintenanceMode) {
      pollTimer.current = setInterval(checkMaintenance, POLL_INTERVAL);
    } else if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
  }, [isMaintenanceMode, checkMaintenance]);

  // Re-check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkMaintenance();
      }
    });

    return () => subscription.remove();
  }, [checkMaintenance]);

  // Register 503 maintenance handler in API base
  useEffect(() => {
    api.setOnMaintenanceMode(handleMaintenanceResponse);
    return () => api.setOnMaintenanceMode(null);
  }, [handleMaintenanceResponse]);

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, message, estimatedEnd, checkMaintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}