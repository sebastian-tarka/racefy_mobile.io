/**
 * Pre-run "GPS health check" — surfaces the device conditions that silently
 * break background recording (missing/imprecise location permission, location
 * services off, Android battery optimization, notifications blocked, power
 * save mode) so the user can fix them BEFORE losing half a run.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { isBatteryOptimized, isPowerSaveMode } from '../services/batteryOptimization';
import { logger } from '../services/logger';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';

export interface GpsHealthState {
  /** Foreground location permission granted */
  locationGranted: boolean;
  /** Android: precise (fine) location, not approximate */
  preciseLocation: boolean;
  /** Device location services (GPS) switched on */
  locationServicesOn: boolean;
  /** Android: app excluded from battery optimization (false = at risk) */
  batteryUnrestricted: boolean;
  /** Notifications allowed — the foreground-service notification must be visible */
  notificationsGranted: boolean;
  /** System power-save mode active (warn-only) */
  powerSaveModeOn: boolean;
  overall: 'ok' | 'warn' | 'blocked';
  isChecking: boolean;
}

const INITIAL: GpsHealthState = {
  locationGranted: true,
  preciseLocation: true,
  locationServicesOn: true,
  batteryUnrestricted: true,
  notificationsGranted: true,
  powerSaveModeOn: false,
  overall: 'ok',
  isChecking: true,
};

function computeOverall(
  s: Omit<GpsHealthState, 'overall' | 'isChecking'>,
): 'ok' | 'warn' | 'blocked' {
  if (!s.locationGranted || !s.locationServicesOn) return 'blocked';
  if (
    !s.preciseLocation ||
    !s.batteryUnrestricted ||
    !s.notificationsGranted ||
    s.powerSaveModeOn
  ) {
    return 'warn';
  }
  return 'ok';
}

/**
 * @param enabled run checks only when relevant (e.g. recording screen, idle state)
 */
export function useGpsHealthCheck(enabled: boolean = true) {
  const [health, setHealth] = useState<GpsHealthState>(INITIAL);
  const checkingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isWeb || !enabled || checkingRef.current) return;
    checkingRef.current = true;

    try {
      const [locationPerm, servicesOn, optimized, notifPerm, powerSave] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync().catch(() => true),
        isBatteryOptimized(),
        Notifications.getPermissionsAsync().catch(() => ({ granted: true }) as any),
        isPowerSaveMode(),
      ]);

      const partial = {
        locationGranted: locationPerm.status === 'granted',
        // android.accuracy === 'coarse' means "approximate location" was chosen
        preciseLocation: !isAndroid || locationPerm.android?.accuracy !== 'coarse',
        locationServicesOn: servicesOn,
        batteryUnrestricted: !optimized,
        notificationsGranted: !isAndroid || notifPerm.granted !== false,
        powerSaveModeOn: powerSave,
      };

      setHealth({ ...partial, overall: computeOverall(partial), isChecking: false });
    } catch (error) {
      logger.warn('gps', 'GPS health check failed', { error });
      setHealth((prev) => ({ ...prev, isChecking: false }));
    } finally {
      checkingRef.current = false;
    }
  }, [enabled]);

  // Re-check when the app returns to foreground (user may have changed settings)
  useEffect(() => {
    if (!enabled) return;

    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return { health, refresh };
}
