import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import type { GpsProfile } from '../config/gpsProfiles';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_BUFFER_KEY = '@racefy_location_buffer';
const FOREGROUND_BUFFER_KEY = '@racefy_foreground_buffer'; // Persisted foreground points
const ACTIVE_ACTIVITY_KEY = '@racefy_active_activity_id';
const GPS_PROFILE_KEY = '@racefy_gps_profile';
const LAST_BACKGROUND_POSITION_KEY = '@racefy_last_bg_position';
const LAST_SYNC_STATUS_KEY = '@racefy_last_sync_status';

// Default thresholds - will be overridden by stored profile
const DEFAULT_GPS_ACCURACY_THRESHOLD = 25;
const DEFAULT_MIN_DISTANCE_THRESHOLD = 3;
const DEFAULT_MAX_REALISTIC_SPEED = 15;

export interface BufferedLocation {
  lat: number;
  lng: number;
  ele?: number;
  time: string;
  speed?: number;
}

// Helper to get stored GPS profile
async function getStoredGpsProfile(): Promise<{
  accuracyThreshold: number;
  minDistanceThreshold: number;
  maxRealisticSpeed: number;
}> {
  try {
    const profileJson = await AsyncStorage.getItem(GPS_PROFILE_KEY);
    if (profileJson) {
      const profile = JSON.parse(profileJson) as GpsProfile;
      return {
        accuracyThreshold: profile.accuracyThreshold,
        minDistanceThreshold: profile.minDistanceThreshold,
        maxRealisticSpeed: profile.maxRealisticSpeed,
      };
    }
  } catch {
    // Ignore errors, use default
  }
  return {
    accuracyThreshold: DEFAULT_GPS_ACCURACY_THRESHOLD,
    minDistanceThreshold: DEFAULT_MIN_DISTANCE_THRESHOLD,
    maxRealisticSpeed: DEFAULT_MAX_REALISTIC_SPEED,
  };
}

// Haversine formula to calculate distance between two coordinates
function calculateDistanceBetweenCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Get and set last background position for distance filtering
interface LastPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

async function getLastBackgroundPosition(): Promise<LastPosition | null> {
  try {
    const json = await AsyncStorage.getItem(LAST_BACKGROUND_POSITION_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function setLastBackgroundPosition(position: LastPosition): Promise<void> {
  await AsyncStorage.setItem(LAST_BACKGROUND_POSITION_KEY, JSON.stringify(position));
}

async function clearLastBackgroundPosition(): Promise<void> {
  await AsyncStorage.removeItem(LAST_BACKGROUND_POSITION_KEY);
}

// Define the background task - this must be at module level
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    logger.error('gps', 'Background location task error', { error });
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      try {
        // Get GPS profile settings
        const profile = await getStoredGpsProfile();
        const { accuracyThreshold, minDistanceThreshold, maxRealisticSpeed } = profile;

        // Get existing buffer and last position
        const existingBuffer = await getLocationBuffer();
        let lastPosition = await getLastBackgroundPosition();

        const newPoints: BufferedLocation[] = [];
        let filteredByAccuracy = 0;
        let filteredByDistance = 0;
        let filteredBySpeed = 0;

        for (const location of locations) {
          // Filter by accuracy
          const accuracy = location.coords.accuracy;
          if (accuracy && accuracy > accuracyThreshold) {
            logger.gps(`Background: Filtered inaccurate (${accuracy?.toFixed(1)}m > ${accuracyThreshold}m)`);
            filteredByAccuracy++;
            continue;
          }

          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          const timestamp = location.timestamp;

          // Stationary detection: if GPS reports very low speed, use stricter distance threshold
          const gpsSpeed = location.coords.speed;
          const isLikelyStationary = gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed < 0.5;
          const effectiveMinDistance = isLikelyStationary
            ? Math.max(minDistanceThreshold, 8) // At least 8m when stationary
            : minDistanceThreshold;

          // Filter by distance and speed if we have a previous position
          if (lastPosition) {
            const distance = calculateDistanceBetweenCoords(
              lastPosition.lat,
              lastPosition.lng,
              lat,
              lng
            );

            // Filter small movements (GPS drift)
            if (distance < effectiveMinDistance) {
              logger.gps(`Background: Filtered small movement (${distance.toFixed(1)}m < ${effectiveMinDistance}m${isLikelyStationary ? ' stationary' : ''})`);
              filteredByDistance++;
              continue;
            }

            // Calculate implied speed and filter unrealistic speeds
            const timeDiff = (timestamp - lastPosition.timestamp) / 1000; // seconds
            if (timeDiff > 0) {
              const impliedSpeed = distance / timeDiff; // m/s
              if (impliedSpeed > maxRealisticSpeed) {
                logger.gps(`Background: Filtered GPS glitch (${(impliedSpeed * 3.6).toFixed(1)} km/h > ${(maxRealisticSpeed * 3.6).toFixed(0)} km/h max)`);
                filteredBySpeed++;
                continue;
              }
            }
          }

          // Point passed all filters, add it
          newPoints.push({
            lat,
            lng,
            ele: location.coords.altitude ?? undefined,
            time: new Date(timestamp).toISOString(),
            speed: location.coords.speed ?? undefined,
          });

          // Update last position for next iteration
          lastPosition = { lat, lng, timestamp };
        }

        // Save last position for next background task execution
        if (lastPosition) {
          await setLastBackgroundPosition(lastPosition);
        }

        if (newPoints.length > 0) {
          // Add to buffer
          const updatedBuffer = [...existingBuffer, ...newPoints];
          await saveLocationBuffer(updatedBuffer);

          logger.gps(`Background: Added ${newPoints.length} points, total: ${updatedBuffer.length}`, { filteredByAccuracy, filteredByDistance, filteredBySpeed });
        } else if (filteredByAccuracy + filteredByDistance + filteredBySpeed > 0) {
          logger.gps(`Background: All ${locations.length} points filtered`, { filteredByAccuracy, filteredByDistance, filteredBySpeed });
        }
      } catch (err) {
        logger.error('gps', 'Failed to save background location', { error: err });
      }
    }
  }
});

// Helper functions for managing the location buffer
export async function getLocationBuffer(): Promise<BufferedLocation[]> {
  try {
    const buffer = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
    return buffer ? JSON.parse(buffer) : [];
  } catch {
    return [];
  }
}

export async function saveLocationBuffer(buffer: BufferedLocation[]): Promise<void> {
  await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(buffer));
}

export async function clearLocationBuffer(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_BUFFER_KEY);
}

export async function getAndClearLocationBuffer(): Promise<BufferedLocation[]> {
  const buffer = await getLocationBuffer();
  await clearLocationBuffer();
  return buffer;
}

// Store active activity ID for background task reference
export async function setActiveActivityId(id: number | null): Promise<void> {
  if (id === null) {
    await AsyncStorage.removeItem(ACTIVE_ACTIVITY_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_ACTIVITY_KEY, id.toString());
  }
}

export async function getActiveActivityId(): Promise<number | null> {
  try {
    const id = await AsyncStorage.getItem(ACTIVE_ACTIVITY_KEY);
    return id ? parseInt(id, 10) : null;
  } catch {
    return null;
  }
}

// Store GPS profile for background task to use
async function storeGpsProfile(profile: GpsProfile): Promise<void> {
  await AsyncStorage.setItem(GPS_PROFILE_KEY, JSON.stringify(profile));
}

// Clear GPS profile when tracking stops
async function clearGpsProfile(): Promise<void> {
  await AsyncStorage.removeItem(GPS_PROFILE_KEY);
}

// Start background location tracking with sport-specific profile
export async function startBackgroundLocationTracking(profile: GpsProfile): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      logger.gps('Background location tracking already running');
      return true;
    }

    // Store the profile for the background task to access
    await storeGpsProfile(profile);

    // Start background location updates with profile-specific settings
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: profile.distanceInterval,
      timeInterval: profile.timeInterval,
      deferredUpdatesInterval: profile.timeInterval * 3, // Batch updates
      deferredUpdatesDistance: profile.distanceInterval * 3,
      showsBackgroundLocationIndicator: true, // iOS: show blue bar
      foregroundService: {
        notificationTitle: 'Racefy',
        notificationBody: 'Tracking your activity...',
        notificationColor: '#10b981',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    });

    logger.gps(`Background location tracking started`, { timeInterval: profile.timeInterval, distanceInterval: profile.distanceInterval });
    return true;
  } catch (error) {
    logger.error('gps', 'Failed to start background location tracking', { error });
    return false;
  }
}

// Stop background location tracking
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      logger.gps('Background location tracking stopped');
    }
    // Clear stored profile and last position
    await clearGpsProfile();
    await clearLastBackgroundPosition();
  } catch (error) {
    logger.error('gps', 'Failed to stop background location tracking', { error });
  }
}

// Check if background location tracking is running
export async function isBackgroundLocationTrackingRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

// ============================================
// FOREGROUND BUFFER PERSISTENCE
// Protects against app crash/kill during foreground tracking
// ============================================

// Get foreground buffer from AsyncStorage
export async function getForegroundBuffer(): Promise<BufferedLocation[]> {
  try {
    const buffer = await AsyncStorage.getItem(FOREGROUND_BUFFER_KEY);
    return buffer ? JSON.parse(buffer) : [];
  } catch {
    return [];
  }
}

// Save foreground buffer to AsyncStorage (call periodically during tracking)
export async function saveForegroundBuffer(buffer: BufferedLocation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FOREGROUND_BUFFER_KEY, JSON.stringify(buffer));
  } catch (err) {
    logger.error('gps', 'Failed to persist foreground buffer', { error: err });
  }
}

// Clear foreground buffer (after successful sync or activity end)
export async function clearForegroundBuffer(): Promise<void> {
  await AsyncStorage.removeItem(FOREGROUND_BUFFER_KEY);
}

// Get all persisted points (both foreground and background buffers)
// Use this on app startup to recover any unsent points
export async function getAllPersistedPoints(): Promise<BufferedLocation[]> {
  const [foreground, background] = await Promise.all([
    getForegroundBuffer(),
    getLocationBuffer(),
  ]);

  // Combine and deduplicate by timestamp
  const seen = new Set<string>();
  const combined: BufferedLocation[] = [];

  for (const point of [...foreground, ...background]) {
    const key = point.time;
    if (!seen.has(key)) {
      seen.add(key);
      combined.push(point);
    }
  }

  // Sort by time
  combined.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return combined;
}

// Clear all persisted points (after successful sync)
export async function clearAllPersistedPoints(): Promise<void> {
  await Promise.all([
    clearForegroundBuffer(),
    clearLocationBuffer(),
  ]);
}

// ============================================
// SYNC STATUS TRACKING
// Track last sync attempt for UI feedback
// ============================================

export interface SyncStatus {
  lastAttempt: string | null;     // ISO timestamp
  lastSuccess: string | null;     // ISO timestamp
  pendingPoints: number;          // Points waiting to be synced
  lastError: string | null;       // Last error message if any
  isOnline: boolean;              // Network status
}

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const status = await AsyncStorage.getItem(LAST_SYNC_STATUS_KEY);
    if (status) {
      return JSON.parse(status);
    }
  } catch {
    // Ignore
  }
  return {
    lastAttempt: null,
    lastSuccess: null,
    pendingPoints: 0,
    lastError: null,
    isOnline: true,
  };
}

export async function updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
  try {
    const current = await getSyncStatus();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(LAST_SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (err) {
    logger.error('gps', 'Failed to update sync status', { error: err });
  }
}

export async function clearSyncStatus(): Promise<void> {
  await AsyncStorage.removeItem(LAST_SYNC_STATUS_KEY);
}
