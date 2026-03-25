import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { buildAnnouncementText, buildMilestoneAnnouncement } from './audioCoach/templates';
import type { GpsProfile } from '../config/gpsProfiles';
import { syncPointsToServer } from './backgroundApiClient';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Module-level timer for background sync
let backgroundSyncTimer: NodeJS.Timeout | null = null;

// Log task registration at module load time for debugging
console.log('[BackgroundLocation] Module loaded, will define task:', BACKGROUND_LOCATION_TASK);
const LOCATION_BUFFER_KEY = '@racefy_location_buffer';
const FOREGROUND_BUFFER_KEY = '@racefy_foreground_buffer'; // Persisted foreground points
const ACTIVE_ACTIVITY_KEY = '@racefy_active_activity_id';
const GPS_PROFILE_KEY = '@racefy_gps_profile';
const LAST_BACKGROUND_POSITION_KEY = '@racefy_last_bg_position';
const LAST_SYNC_STATUS_KEY = '@racefy_last_sync_status';
const BACKGROUND_SYNC_STATE_KEY = '@racefy_bg_sync_state';

// Default thresholds - will be overridden by stored profile
const DEFAULT_GPS_ACCURACY_THRESHOLD = 25;
const DEFAULT_MIN_DISTANCE_THRESHOLD = 3;
const DEFAULT_MAX_REALISTIC_SPEED = 15;
const DEFAULT_STATIONARY_SPEED_THRESHOLD = 0.5; // 0.5 m/s = 1.8 km/h

export interface BufferedLocation {
  lat: number;
  lng: number;
  ele?: number;
  time: string;
  speed?: number;
  accuracy?: number;
}

// Helper to get stored GPS profile
async function getStoredGpsProfile(): Promise<{
  accuracyThreshold: number;
  minDistanceThreshold: number;
  maxRealisticSpeed: number;
  stationarySpeedThreshold: number;
  backgroundSyncInterval?: number;
  backgroundSyncEnabled?: boolean;
}> {
  try {
    const profileJson = await AsyncStorage.getItem(GPS_PROFILE_KEY);
    if (profileJson) {
      const profile = JSON.parse(profileJson) as GpsProfile;
      return {
        accuracyThreshold: profile.accuracyThreshold,
        minDistanceThreshold: profile.minDistanceThreshold,
        maxRealisticSpeed: profile.maxRealisticSpeed,
        stationarySpeedThreshold: profile.stationarySpeedThreshold ?? DEFAULT_STATIONARY_SPEED_THRESHOLD,
        backgroundSyncInterval: profile.backgroundSyncInterval,
        backgroundSyncEnabled: profile.backgroundSyncEnabled,
      };
    }
  } catch {
    // Ignore errors, use default
  }
  return {
    accuracyThreshold: DEFAULT_GPS_ACCURACY_THRESHOLD,
    minDistanceThreshold: DEFAULT_MIN_DISTANCE_THRESHOLD,
    maxRealisticSpeed: DEFAULT_MAX_REALISTIC_SPEED,
    stationarySpeedThreshold: DEFAULT_STATIONARY_SPEED_THRESHOLD,
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
export interface LastPosition {
  lat: number;
  lng: number;
  timestamp: number;
}

export async function getLastBackgroundPosition(): Promise<LastPosition | null> {
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

// ============================================
// BACKGROUND SYNC LOGIC
// Periodically syncs buffered GPS points to server
// ============================================

async function performBackgroundSync(): Promise<void> {
  try {
    // Get activity ID
    const activityId = await getActiveActivityId();
    if (!activityId) {
      logger.gps('Background sync: No active activity');
      return;
    }

    // Get sync state
    const syncState = await getBackgroundSyncState();

    // Get buffer and calculate unsynced points
    const buffer = await getLocationBuffer();
    const unsyncedPoints = buffer.slice(syncState.syncedPointsCount);

    if (unsyncedPoints.length === 0) {
      logger.gps('Background sync: No new points to sync');
      return;
    }

    // Log attempt
    logger.gps(`Background sync: Attempting to sync ${unsyncedPoints.length} points`);

    // Call API
    const result = await syncPointsToServer(activityId, unsyncedPoints);

    if (result.success) {
      // Update state: increment synced count
      await updateBackgroundSyncState({
        lastSyncSuccess: Date.now(),
        lastSyncAttempt: Date.now(),
        syncedPointsCount: buffer.length,
        consecutiveFailures: 0,
        totalPointsSynced: syncState.totalPointsSynced + unsyncedPoints.length,
      });
      logger.gps(`Background sync: SUCCESS (${unsyncedPoints.length} points synced, total: ${buffer.length})`);
    } else {
      // Update failure count
      await updateBackgroundSyncState({
        lastSyncAttempt: Date.now(),
        consecutiveFailures: syncState.consecutiveFailures + 1,
      });
      logger.warn('gps', `Background sync: FAILED - ${result.error}`, {
        consecutiveFailures: syncState.consecutiveFailures + 1,
      });
    }
  } catch (err) {
    logger.error('gps', 'Background sync: Exception', { error: err });
  }
}

// ============================================
// AUDIO COACH — BACKGROUND ANNOUNCEMENTS
// Runs inside the headless JS task, independent of React.
// Tracks accumulated distance and speaks at km thresholds.
// ============================================

const BG_AUDIO_DISTANCE_KEY = '@racefy:audioCoach:bgDistance';
const BG_AUDIO_THRESHOLD_KEY = '@racefy:audioCoach:bgLastThreshold';
const BG_AUDIO_START_TIME_KEY = '@racefy:audioCoach:bgStartTime';
const AUDIO_COACH_SETTINGS_KEY = '@racefy:audioCoach:settings';
const BG_AUDIO_SIM_KEY = '@racefy:audioCoach:bgSimStartTime'; // DEV sim mode
const BG_AUDIO_MILESTONES_KEY = '@racefy:audioCoach:bgMilestones'; // JSON array of unachieved thresholds (km)
const BG_AUDIO_PASSED_MILESTONES_KEY = '@racefy:audioCoach:bgPassedMilestones'; // JSON array of already announced

const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US', pl: 'pl-PL', de: 'de-DE', fr: 'fr-FR',
  es: 'es-ES', it: 'it-IT', pt: 'pt-PT',
};

/**
 * Called from the background task on every GPS event (even filtered ones).
 * In normal mode: accumulates real GPS distance.
 * In sim mode (DEV): calculates distance from elapsed time (~350m/10s).
 *
 * Key: this runs in a headless JS context — no React, no hooks, no component tree.
 * Speech.speak() works here because expo-speech uses native TTS directly.
 */
async function handleAudioCoachBackground(distanceAddedM: number): Promise<void> {
  try {
    // Check sim mode first — sim bypasses settings.enabled check
    const simStartStr = await AsyncStorage.getItem(BG_AUDIO_SIM_KEY);
    const isSimMode = !!simStartStr;

    // Read settings (language, style, interval, etc.)
    const settingsJson = await AsyncStorage.getItem(AUDIO_COACH_SETTINGS_KEY);
    const settings = settingsJson ? JSON.parse(settingsJson) : null;

    // In real mode, require settings.enabled. In sim mode, skip this check.
    if (!isSimMode) {
      if (!settings || !settings.enabled) return;
    }

    // Use defaults if settings not available (sim mode without configured settings)
    const language = settings?.language || 'pl';
    const style = settings?.style || 'neutral';
    const intervalKm = settings?.intervalKm || 1;
    const speechRate = settings?.speechRate || 1.0;
    const speechPitch = settings?.speechPitch || 1.0;

    // Calculate distance
    let totalDistM: number;
    if (isSimMode) {
      // Sim mode: ~350m every 10s from sim start time
      const simStart = parseInt(simStartStr!, 10);
      totalDistM = Math.floor((Date.now() - simStart) / 10000) * 350;
    } else {
      // Real mode: accumulate GPS distance
      const prevDistStr = await AsyncStorage.getItem(BG_AUDIO_DISTANCE_KEY);
      totalDistM = (prevDistStr ? parseFloat(prevDistStr) : 0) + distanceAddedM;
    }
    await AsyncStorage.setItem(BG_AUDIO_DISTANCE_KEY, totalDistM.toString());

    // Check threshold
    const lastThresholdStr = await AsyncStorage.getItem(BG_AUDIO_THRESHOLD_KEY);
    const lastThreshold = lastThresholdStr ? parseFloat(lastThresholdStr) : 0;

    const totalDistKm = totalDistM / 1000;
    const currentThreshold = Math.floor(totalDistKm / intervalKm) * intervalKm;

    if (currentThreshold <= 0 || currentThreshold <= lastThreshold) return;

    // Threshold crossed!
    await AsyncStorage.setItem(BG_AUDIO_THRESHOLD_KEY, currentThreshold.toString());

    // Calculate average pace (min/km) from elapsed time
    const startTimeStr = await AsyncStorage.getItem(BG_AUDIO_START_TIME_KEY);
    const startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
    const elapsedMin = (Date.now() - startTime) / 60000;
    const paceMinPerKm = totalDistKm > 0 ? elapsedMin / totalDistKm : 0;

    const text = buildAnnouncementText({
      language,
      style,
      km: currentThreshold,
      pace: isSimMode ? 5.5 : paceMinPerKm, // Sim uses fixed pace
      heartRate: undefined,
      splitDelta: undefined,
    });

    logger.info('audioCoach', 'BG threshold crossed, speaking', {
      km: currentThreshold,
      totalDistM: Math.round(totalDistM),
      pace: isSimMode ? '5.50 (sim)' : paceMinPerKm.toFixed(2),
      sim: isSimMode,
    });

    // expo-speech uses native TTS — works in headless JS context.
    // Android TTS automatically requests AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
    // which ducks (quiets) music instead of pausing it.
    Speech.speak(text, {
      language: SPEECH_LANG_MAP[language] || 'en-US',
      rate: speechRate,
      pitch: speechPitch,
    });

    // Check milestone announcements (premium feature — thresholds stored by UI)
    try {
      const milestonesJson = await AsyncStorage.getItem(BG_AUDIO_MILESTONES_KEY);
      const passedJson = await AsyncStorage.getItem(BG_AUDIO_PASSED_MILESTONES_KEY);
      if (milestonesJson) {
        const thresholds: number[] = JSON.parse(milestonesJson);
        const passed: number[] = passedJson ? JSON.parse(passedJson) : [];

        for (const threshold of thresholds) {
          if (totalDistKm >= threshold && !passed.includes(threshold)) {
            const milestoneText = buildMilestoneAnnouncement(language, threshold);
            if (milestoneText) {
              passed.push(threshold);
              await AsyncStorage.setItem(BG_AUDIO_PASSED_MILESTONES_KEY, JSON.stringify(passed));
              logger.info('audioCoach', 'BG milestone reached!', { threshold, totalDistKm: totalDistKm.toFixed(2) });
              // Speak milestone after a short delay (so km announcement finishes first)
              setTimeout(() => {
                Speech.speak(milestoneText, {
                  language: SPEECH_LANG_MAP[language] || 'en-US',
                  rate: speechRate,
                  pitch: speechPitch,
                });
              }, 4000);
            }
          }
        }
      }
    } catch {
      // Silent — milestones are optional
    }
  } catch (err) {
    // Silent fail — never break GPS tracking for audio
    logger.error('audioCoach', 'BG audio coach error', { error: err });
  }
}

/** Clear background audio coach state (called on tracking start/stop) */
export async function clearAudioCoachBackgroundState(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(BG_AUDIO_DISTANCE_KEY),
    AsyncStorage.removeItem(BG_AUDIO_THRESHOLD_KEY),
    AsyncStorage.removeItem(BG_AUDIO_START_TIME_KEY),
    AsyncStorage.removeItem(BG_AUDIO_MILESTONES_KEY),
    AsyncStorage.removeItem(BG_AUDIO_PASSED_MILESTONES_KEY),
  ]);
}

/**
 * Store milestone thresholds for background audio coach.
 * Called from UI when tracking starts and milestones are available.
 */
export async function setAudioCoachMilestones(thresholdsKm: number[]): Promise<void> {
  await AsyncStorage.setItem(BG_AUDIO_MILESTONES_KEY, JSON.stringify(thresholdsKm));
  await AsyncStorage.setItem(BG_AUDIO_PASSED_MILESTONES_KEY, JSON.stringify([]));
}

/** Initialize background audio coach state (called on tracking start) */
export async function initAudioCoachBackgroundState(): Promise<void> {
  await AsyncStorage.setItem(BG_AUDIO_START_TIME_KEY, Date.now().toString());
  await AsyncStorage.setItem(BG_AUDIO_DISTANCE_KEY, '0');
  await AsyncStorage.setItem(BG_AUDIO_THRESHOLD_KEY, '0');
}

/**
 * Sync foreground distance to background audio coach state.
 * Called when app transitions to background so that the background task
 * continues accumulating from the correct total distance instead of
 * only counting distance from previous background sessions.
 */
export async function syncAudioCoachForegroundDistance(totalDistanceM: number): Promise<void> {
  try {
    await AsyncStorage.setItem(BG_AUDIO_DISTANCE_KEY, totalDistanceM.toString());
    logger.info('audioCoach', 'Synced foreground distance to background', {
      totalDistanceM: Math.round(totalDistanceM),
    });
  } catch (err) {
    logger.error('audioCoach', 'Failed to sync foreground distance', { error: err });
  }
}

// Define the background task - this must be at module level
// IMPORTANT: This code runs in a separate JS context when in background
// It must be defined at module level BEFORE React Native initializes
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    logger.error('gps', 'Background location task error', { error });
    // Log to AsyncStorage for debugging (can't use logger in background on some Android versions)
    try {
      const errorLog = await AsyncStorage.getItem('@racefy_bg_errors') || '[]';
      const errors = JSON.parse(errorLog);
      errors.push({ timestamp: new Date().toISOString(), error: error.message });
      await AsyncStorage.setItem('@racefy_bg_errors', JSON.stringify(errors.slice(-10)));
    } catch {}
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      try {
        // Get GPS profile settings
        const profile = await getStoredGpsProfile();
        const { accuracyThreshold, minDistanceThreshold, maxRealisticSpeed, stationarySpeedThreshold } = profile;

        // Get existing buffer and last position
        const existingBuffer = await getLocationBuffer();
        let lastPosition = await getLastBackgroundPosition();

        const newPoints: BufferedLocation[] = [];
        let filteredByAccuracy = 0;
        let filteredByDistance = 0;
        let filteredBySpeed = 0;
        let audioCoachDistAdded = 0; // Track distance for audio coach

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
          const isLikelyStationary = gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed < stationarySpeedThreshold;
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

          // Track distance for audio coach (before updating lastPosition)
          if (lastPosition) {
            audioCoachDistAdded += calculateDistanceBetweenCoords(
              lastPosition.lat, lastPosition.lng, lat, lng,
            );
          }

          // Point passed all filters, add it
          newPoints.push({
            lat,
            lng,
            ele: location.coords.altitude ?? undefined,
            time: new Date(timestamp).toISOString(),
            speed: location.coords.speed ?? undefined,
            accuracy: location.coords.accuracy ?? undefined,
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

          // Initialize background sync timer on first GPS update if not already running
          if (!backgroundSyncTimer) {
            const profile = await getStoredGpsProfile();
            // Check if background sync is enabled for this profile
            const syncEnabled = (profile as any).backgroundSyncEnabled ?? true;
            const syncInterval = (profile as any).backgroundSyncInterval ?? 240000; // Default: 4 minutes

            if (syncEnabled) {
              logger.gps(`Background sync: Initializing timer (interval: ${syncInterval / 1000}s)`);
              backgroundSyncTimer = setInterval(async () => {
                await performBackgroundSync();
              }, syncInterval);
            } else {
              logger.gps('Background sync: Disabled by GPS profile');
            }
          }
        } else if (filteredByAccuracy + filteredByDistance + filteredBySpeed > 0) {
          logger.gps(`Background: All ${locations.length} points filtered`, { filteredByAccuracy, filteredByDistance, filteredBySpeed });
        }

        // Audio coach: always check (works for both real GPS and sim mode)
        logger.debug('audioCoach', 'BG task: checking audio coach', {
          distAdded: Math.round(audioCoachDistAdded),
          newPts: newPoints.length,
        });
        await handleAudioCoachBackground(audioCoachDistAdded);
      } catch (err) {
        logger.error('gps', 'Failed to save background location', { error: err });
      }
    }
  }
});

// Verify task registration
console.log('[BackgroundLocation] Task defined successfully:', BACKGROUND_LOCATION_TASK);

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
  try {
    const buffer = await getLocationBuffer();
    // Only clear after successful read to prevent data loss
    if (buffer.length > 0) {
      await clearLocationBuffer();
    }
    return buffer;
  } catch (error) {
    logger.error('gps', 'Failed to get and clear location buffer', { error });
    return []; // Return empty on error, don't clear
  }
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

    // Initialize audio coach background state for this session
    await initAudioCoachBackgroundState();

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

/**
 * DEV ONLY: Start a lightweight background location task for audio coach sim.
 * Uses lowest accuracy — just keeps the foreground service alive so the task
 * fires periodically and can run TTS in background.
 */
export async function startSimBackgroundTracking(): Promise<boolean> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      logger.gps('Sim: Background tracking already running');
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      logger.warn('gps', 'Sim: Location permission not granted');
      return false;
    }

    await initAudioCoachBackgroundState();

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Lowest,
      timeInterval: 10000,     // every 10s
      distanceInterval: 0,     // fire even when stationary
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Racefy',
        notificationBody: 'Audio coach sim running...',
        notificationColor: '#ef4444',
      },
      pausesUpdatesAutomatically: false,
    });

    logger.gps('Sim: Lightweight background tracking started');
    return true;
  } catch (error) {
    logger.error('gps', 'Sim: Failed to start background tracking', { error });
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
    // Clear background sync timer
    if (backgroundSyncTimer) {
      clearInterval(backgroundSyncTimer);
      backgroundSyncTimer = null;
      logger.gps('Background sync timer cleared');
    }
    // Clear stored profile, last position, and audio coach state
    await clearGpsProfile();
    await clearLastBackgroundPosition();
    await clearAudioCoachBackgroundState();
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

// ============================================
// BACKGROUND SYNC STATE MANAGEMENT
// Tracks which points from the buffer have been synced
// ============================================

export interface BackgroundSyncState {
  lastSyncAttempt: number | null;    // Timestamp (ms)
  lastSyncSuccess: number | null;    // Timestamp (ms)
  syncedPointsCount: number;         // Points already synced from buffer
  consecutiveFailures: number;       // Failure counter for monitoring
  totalPointsSynced: number;         // Lifetime counter
}

export async function getBackgroundSyncState(): Promise<BackgroundSyncState> {
  try {
    const state = await AsyncStorage.getItem(BACKGROUND_SYNC_STATE_KEY);
    if (state) {
      return JSON.parse(state);
    }
  } catch (err) {
    logger.error('gps', 'Failed to get background sync state', { error: err });
  }
  // Return default state
  return {
    lastSyncAttempt: null,
    lastSyncSuccess: null,
    syncedPointsCount: 0,
    consecutiveFailures: 0,
    totalPointsSynced: 0,
  };
}

export async function updateBackgroundSyncState(updates: Partial<BackgroundSyncState>): Promise<void> {
  try {
    const current = await getBackgroundSyncState();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(BACKGROUND_SYNC_STATE_KEY, JSON.stringify(updated));
  } catch (err) {
    logger.error('gps', 'Failed to update background sync state', { error: err });
  }
}

export async function clearBackgroundSyncState(): Promise<void> {
  await AsyncStorage.removeItem(BACKGROUND_SYNC_STATE_KEY);
}
