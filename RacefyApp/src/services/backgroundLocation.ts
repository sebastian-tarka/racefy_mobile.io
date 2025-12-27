import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_BUFFER_KEY = '@racefy_location_buffer';
const ACTIVE_ACTIVITY_KEY = '@racefy_active_activity_id';

export interface BufferedLocation {
  lat: number;
  lng: number;
  ele?: number;
  time: string;
  speed?: number;
}

// Define the background task - this must be at module level
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      try {
        // Get existing buffer
        const existingBuffer = await getLocationBuffer();

        // Convert locations to our format
        const newPoints: BufferedLocation[] = locations.map((location) => ({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          ele: location.coords.altitude ?? undefined,
          time: new Date(location.timestamp).toISOString(),
          speed: location.coords.speed ?? undefined,
        }));

        // Add to buffer
        const updatedBuffer = [...existingBuffer, ...newPoints];
        await saveLocationBuffer(updatedBuffer);

        console.log(`Background: Added ${newPoints.length} points, total: ${updatedBuffer.length}`);
      } catch (err) {
        console.error('Failed to save background location:', err);
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

// Start background location tracking
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      console.log('Background location tracking already running');
      return true;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 10, // meters
      timeInterval: 5000, // 5 seconds
      deferredUpdatesInterval: 10000, // batch updates every 10 seconds
      deferredUpdatesDistance: 20, // or every 20 meters
      showsBackgroundLocationIndicator: true, // iOS: show blue bar
      foregroundService: {
        notificationTitle: 'Racefy',
        notificationBody: 'Tracking your activity...',
        notificationColor: '#10b981',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Failed to start background location tracking:', error);
    return false;
  }
}

// Stop background location tracking
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Failed to stop background location tracking:', error);
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
