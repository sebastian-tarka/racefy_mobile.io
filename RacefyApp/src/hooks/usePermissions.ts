import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../services/logger';

const isWeb = Platform.OS === 'web';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface PermissionsState {
  location: PermissionStatus;
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    location: 'undetermined',
    camera: 'undetermined',
    mediaLibrary: 'undetermined',
  });
  const [isChecking, setIsChecking] = useState(true);

  // Check current permission status
  const checkPermissions = useCallback(async () => {
    if (isWeb) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const [locationStatus, cameraStatus, mediaStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        ImagePicker.getCameraPermissionsAsync(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
      ]);

      setPermissions({
        location: locationStatus.status as PermissionStatus,
        camera: cameraStatus.status as PermissionStatus,
        mediaLibrary: mediaStatus.status as PermissionStatus,
      });
    } catch (error) {
      logger.error('general', 'Error checking permissions', { error });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Request foreground location permission
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setPermissions((prev) => ({ ...prev, location: 'granted' }));
        return true;
      }

      if (!canAskAgain) {
        showSettingsAlert(
          'Location Permission Required',
          'Please enable location access in your device settings to track activities.'
        );
      }

      setPermissions((prev) => ({ ...prev, location: 'denied' }));
      return false;
    } catch (error) {
      logger.error('gps', 'Error requesting location permission', { error });
      return false;
    }
  }, []);

  // Request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();

      if (status === 'granted') {
        setPermissions((prev) => ({ ...prev, camera: 'granted' }));
        return true;
      }

      if (!canAskAgain) {
        showSettingsAlert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.'
        );
      }

      setPermissions((prev) => ({ ...prev, camera: 'denied' }));
      return false;
    } catch (error) {
      logger.error('general', 'Error requesting camera permission', { error });
      return false;
    }
  }, []);

  // Request media library permission
  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status === 'granted') {
        setPermissions((prev) => ({ ...prev, mediaLibrary: 'granted' }));
        return true;
      }

      if (!canAskAgain) {
        showSettingsAlert(
          'Photo Library Permission Required',
          'Please enable photo library access in your device settings to select photos.'
        );
      }

      setPermissions((prev) => ({ ...prev, mediaLibrary: 'denied' }));
      return false;
    } catch (error) {
      logger.error('general', 'Error requesting media library permission', { error });
      return false;
    }
  }, []);

  // Helper to show settings alert
  const showSettingsAlert = (title: string, message: string) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
        },
      },
    ]);
  };

  // Check if location services are enabled
  const checkLocationServices = useCallback(async (): Promise<boolean> => {
    if (isWeb) return true; // Skip check on web

    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to track activities.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      logger.error('gps', 'Error checking location services', { error });
      return true; // Return true on error to not block
    }
  }, []);

  // Request all permissions needed for activity tracking
  // Android: foreground location only - background tracking is handled by foreground service (persistent notification)
  // iOS: foreground location only - background tracking uses blue status bar indicator
  const requestActivityTrackingPermissions = useCallback(async (): Promise<boolean> => {
    // On web, just return false (will use simulated)
    if (isWeb) {
      logger.info('general', 'Web platform - using simulated data');
      return false;
    }

    try {
      // Check if location services are enabled
      const servicesEnabled = await checkLocationServices();
      if (!servicesEnabled) return false;

      // Request foreground location - this is all we need
      // Background tracking continues via the foreground service notification
      const locationGranted = await requestLocationPermission();
      if (!locationGranted) return false;

      return true;
    } catch (error) {
      logger.error('activity', 'Error requesting activity permissions', { error });
      return false;
    }
  }, [checkLocationServices, requestLocationPermission]);

  return {
    permissions,
    isChecking,
    checkPermissions,
    requestLocationPermission,
    requestCameraPermission,
    requestMediaLibraryPermission,
    requestActivityTrackingPermissions,
    checkLocationServices,
  };
}
