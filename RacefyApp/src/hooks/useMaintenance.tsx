import {useAppConfig} from '../contexts/AppConfigContext';

/**
 * Maintenance mode selector built on top of {@link AppConfigContext}.
 *
 * Public API is unchanged from the previous standalone provider so call
 * sites (`AppNavigator`, `MaintenanceScreen`) don't need to change. The
 * actual fetching, polling, AppState handling, and 503 wiring all live
 * in `AppConfigProvider`.
 */
export function useMaintenance() {
  const {
    isMaintenanceMode,
    maintenanceMessage,
    maintenanceEstimatedEnd,
    refresh,
  } = useAppConfig();

  return {
    isMaintenanceMode,
    message: maintenanceMessage,
    estimatedEnd: maintenanceEstimatedEnd,
    checkMaintenance: refresh,
  };
}