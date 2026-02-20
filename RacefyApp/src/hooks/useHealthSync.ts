import { useState, useEffect, useCallback } from 'react';
import {
  healthService,
  isHealthSyncEnabled,
  setHealthSyncEnabled,
  type HealthServiceStatus,
} from '../services/healthService';
import { logger } from '../services/logger';

interface UseHealthSyncReturn {
  /** Whether health sync is enabled by the user */
  isEnabled: boolean;
  /** Current health service status */
  status: HealthServiceStatus;
  /** Whether the service is still loading initial state */
  isLoading: boolean;
  /** Toggle health sync on/off (requests permission when enabling) */
  toggle: () => Promise<void>;
  /** Explicitly request heart rate permission */
  requestPermission: () => Promise<boolean>;
  /** Whether the user has granted HR permission */
  hasPermission: boolean;
}

/**
 * Hook for managing health sync settings UI state.
 */
export function useHealthSync(): UseHealthSyncReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<HealthServiceStatus>('not_available');
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    const init = async () => {
      try {
        const [enabled, serviceStatus] = await Promise.all([
          isHealthSyncEnabled(),
          healthService.getStatus(),
        ]);

        setIsEnabled(enabled);
        setStatus(serviceStatus);

        if (serviceStatus === 'available' && enabled) {
          const perm = await healthService.hasHeartRatePermission();
          setHasPermission(perm);
        }
      } catch (error) {
        logger.error('general', 'Failed to init health sync state', { error });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await healthService.requestHeartRatePermission();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      logger.error('general', 'Failed to request HR permission', { error });
      return false;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isEnabled) {
      // Turning off — just disable
      await setHealthSyncEnabled(false);
      setIsEnabled(false);
      logger.info('general', 'Health sync disabled');
    } else {
      // Turning on — check availability and request permission
      const serviceStatus = await healthService.getStatus();
      setStatus(serviceStatus);

      if (serviceStatus !== 'available') {
        logger.info('general', 'Health service not available, cannot enable sync', {
          status: serviceStatus,
        });
        return;
      }

      const granted = await requestPermission();
      if (granted) {
        await setHealthSyncEnabled(true);
        setIsEnabled(true);
        logger.info('general', 'Health sync enabled');
      } else {
        logger.info('general', 'HR permission denied, not enabling sync');
      }
    }
  }, [isEnabled, requestPermission]);

  return {
    isEnabled,
    status,
    isLoading,
    toggle,
    requestPermission,
    hasPermission,
  };
}
