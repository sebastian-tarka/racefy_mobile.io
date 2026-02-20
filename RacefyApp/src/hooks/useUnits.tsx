import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../services/logger';
import {
  UnitSystem,
  formatDistance as _formatDistance,
  formatDistanceShort as _formatDistanceShort,
  formatTotalDistance as _formatTotalDistance,
  formatDistanceFromKm as _formatDistanceFromKm,
  formatDistanceFromKmRounded as _formatDistanceFromKmRounded,
  formatElevation as _formatElevation,
  formatSpeed as _formatSpeed,
  formatPaceFromSpeed as _formatPaceFromSpeed,
  formatPaceFromDistanceTime as _formatPaceFromDistanceTime,
  formatPaceWithUnit as _formatPaceWithUnit,
  formatPaceFromSecPerKm as _formatPaceFromSecPerKm,
  formatTemperature as _formatTemperature,
  getDistanceUnit as _getDistanceUnit,
  getSmallDistanceUnit as _getSmallDistanceUnit,
  getElevationUnit as _getElevationUnit,
  getSpeedUnit as _getSpeedUnit,
  getPaceUnit as _getPaceUnit,
  getTemperatureUnit as _getTemperatureUnit,
  getSplitLabel as _getSplitLabel,
  getMilestoneLabel as _getMilestoneLabel,
  getDistanceValue as _getDistanceValue,
  getDistanceValueFromKm as _getDistanceValueFromKm,
} from '../utils/unitConversions';

export type { UnitSystem } from '../utils/unitConversions';

const UNITS_STORAGE_KEY = '@racefy_units';

// Module-level state for imperative updates (from useAuth)
let _setUnitsState: ((units: UnitSystem) => void) | null = null;

/**
 * Imperative function to sync units preference from server.
 * Called by useAuth after fetching preferences.
 */
export async function syncUnitsPreference(units: UnitSystem): Promise<void> {
  try {
    await AsyncStorage.setItem(UNITS_STORAGE_KEY, units);
    if (_setUnitsState) {
      _setUnitsState(units);
    }
  } catch (error) {
    logger.error('general', 'Failed to sync units preference', { error });
  }
}

interface UnitsContextType {
  units: UnitSystem;
  setUnits: (units: UnitSystem) => Promise<void>;
  formatDistance: (meters: number) => string;
  formatDistanceShort: (meters: number) => string;
  formatTotalDistance: (meters: number) => string;
  formatDistanceFromKm: (km: number) => string;
  formatDistanceFromKmRounded: (km: number) => string;
  formatElevation: (meters: number) => string;
  formatSpeed: (mps: number) => string;
  formatPaceFromSpeed: (avgSpeedMps: number) => string;
  formatPaceFromDistanceTime: (meters: number, seconds: number) => string;
  formatPaceWithUnit: (meters: number, seconds: number) => string;
  formatPaceFromSecPerKm: (secondsPerKm: number | null, placeholder?: string) => string;
  formatTemperature: (celsius: number) => string;
  getDistanceUnit: () => string;
  getSmallDistanceUnit: () => string;
  getElevationUnit: () => string;
  getSpeedUnit: () => string;
  getPaceUnit: () => string;
  getTemperatureUnit: () => string;
  getSplitLabel: () => string;
  getMilestoneLabel: (key: string) => string;
  getDistanceValue: (meters: number) => number;
  getDistanceValueFromKm: (km: number) => number;
}

const UnitsContext = createContext<UnitsContextType | null>(null);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsLocal] = useState<UnitSystem>('metric');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadUnitsPreference();
  }, []);

  // Register module-level setter so syncUnitsPreference can update state
  useEffect(() => {
    _setUnitsState = setUnitsLocal;
    return () => {
      _setUnitsState = null;
    };
  }, []);

  async function loadUnitsPreference() {
    try {
      const saved = await AsyncStorage.getItem(UNITS_STORAGE_KEY);
      if (saved === 'metric' || saved === 'imperial') {
        setUnitsLocal(saved);
      }
    } catch (error) {
      logger.error('general', 'Failed to load units preference', { error });
    } finally {
      setIsLoaded(true);
    }
  }

  const setUnits = useCallback(async (newUnits: UnitSystem) => {
    try {
      await AsyncStorage.setItem(UNITS_STORAGE_KEY, newUnits);
      setUnitsLocal(newUnits);
    } catch (error) {
      logger.error('general', 'Failed to save units preference', { error });
    }
  }, []);

  const value = useMemo<UnitsContextType>(() => ({
    units,
    setUnits,
    formatDistance: (meters: number) => _formatDistance(meters, units),
    formatDistanceShort: (meters: number) => _formatDistanceShort(meters, units),
    formatTotalDistance: (meters: number) => _formatTotalDistance(meters, units),
    formatDistanceFromKm: (km: number) => _formatDistanceFromKm(km, units),
    formatDistanceFromKmRounded: (km: number) => _formatDistanceFromKmRounded(km, units),
    formatElevation: (meters: number) => _formatElevation(meters, units),
    formatSpeed: (mps: number) => _formatSpeed(mps, units),
    formatPaceFromSpeed: (avgSpeedMps: number) => _formatPaceFromSpeed(avgSpeedMps, units),
    formatPaceFromDistanceTime: (meters: number, seconds: number) =>
      _formatPaceFromDistanceTime(meters, seconds, units),
    formatPaceWithUnit: (meters: number, seconds: number) =>
      _formatPaceWithUnit(meters, seconds, units),
    formatPaceFromSecPerKm: (secondsPerKm: number | null, placeholder?: string) =>
      _formatPaceFromSecPerKm(secondsPerKm, units, placeholder),
    formatTemperature: (celsius: number) => _formatTemperature(celsius, units),
    getDistanceUnit: () => _getDistanceUnit(units),
    getSmallDistanceUnit: () => _getSmallDistanceUnit(units),
    getElevationUnit: () => _getElevationUnit(units),
    getSpeedUnit: () => _getSpeedUnit(units),
    getPaceUnit: () => _getPaceUnit(units),
    getTemperatureUnit: () => _getTemperatureUnit(units),
    getSplitLabel: () => _getSplitLabel(units),
    getMilestoneLabel: (key: string) => _getMilestoneLabel(key, units),
    getDistanceValue: (meters: number) => _getDistanceValue(meters, units),
    getDistanceValueFromKm: (km: number) => _getDistanceValueFromKm(km, units),
  }), [units, setUnits]);

  if (!isLoaded) {
    return null;
  }

  return (
    <UnitsContext.Provider value={value}>
      {children}
    </UnitsContext.Provider>
  );
}

export const useUnits = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error('useUnits must be used within UnitsProvider');
  }
  return context;
};
