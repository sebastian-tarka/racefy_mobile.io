import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { logger } from '../services/logger';

const isWeb = Platform.OS === 'web';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface PermissionsState {
  location: PermissionStatus;
  locationBackground: PermissionStatus;
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionsState>({
    location: 'undetermined',
    locationBackground: 'undetermined',
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

      let backgroundStatus: Location.PermissionResponse | null = null;
      if (locationStatus.status === 'granted') {
        backgroundStatus = await Location.getBackgroundPermissionsAsync();
      }

      setPermissions({
        location: locationStatus.status as PermissionStatus,
        locationBackground: (backgroundStatus?.status || 'undetermined') as PermissionStatus,
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

  // Request background location permission (requires foreground first)
  const requestBackgroundLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      // First ensure we have foreground permission
      if (permissions.location !== 'granted') {
        const foregroundGranted = await requestLocationPermission();
        if (!foregroundGranted) return false;
      }

      // On iOS, show explanation before requesting
      if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
          Alert.alert(
            'Background Location',
            'Racefy needs background location access to continue tracking your activity when the app is in the background. This helps ensure accurate distance and route tracking.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  setPermissions((prev) => ({ ...prev, locationBackground: 'denied' }));
                  resolve(false);
                },
              },
              {
                text: 'Continue',
                onPress: async () => {
                  const { status } = await Location.requestBackgroundPermissionsAsync();
                  setPermissions((prev) => ({
                    ...prev,
                    locationBackground: status as PermissionStatus,
                  }));
                  resolve(status === 'granted');
                },
              },
            ],
            { cancelable: false }
          );
        });
      }

      // Android
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();

      if (status === 'granted') {
        setPermissions((prev) => ({ ...prev, locationBackground: 'granted' }));
        return true;
      }

      if (!canAskAgain) {
        showSettingsAlert(
          'Background Location Required',
          'For accurate activity tracking, please enable "Allow all the time" location access in settings.'
        );
      }

      setPermissions((prev) => ({ ...prev, locationBackground: 'denied' }));
      return false;
    } catch (error) {
      logger.error('gps', 'Error requesting background location permission', { error });
      return false;
    }
  }, [permissions.location, requestLocationPermission]);

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
  const requestActivityTrackingPermissions = useCallback(async (): Promise<boolean> => {
    // On web, just return false (will use simulated)
    if (isWeb) {
      logger.info('general', 'Web platform - using simulated data');
      return false;
    }

    try {
      // First check if location services are enabled
      const servicesEnabled = await checkLocationServices();
      if (!servicesEnabled) return false;

      // Request foreground location
      const locationGranted = await requestLocationPermission();
      if (!locationGranted) return false;

      // Request background location - REQUIRED for activity tracking
      // We need to await this to ensure background tracking works
      const backgroundGranted = await requestBackgroundLocationPermission();

      if (!backgroundGranted) {
        // Show warning but allow to continue with foreground only
        Alert.alert(
          'Background Location',
          'Without background location permission, tracking may stop when you switch apps. For best results, please allow "Always" location access in Settings.',
          [
            { text: 'Continue Anyway', style: 'cancel' },
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
      }

      return true; // Allow starting even without background permission
    } catch (error) {
      logger.error('activity', 'Error requesting activity permissions', { error });
      return false;
    }
  }, [checkLocationServices, requestLocationPermission, requestBackgroundLocationPermission]);

  return {
    permissions,
    isChecking,
    checkPermissions,
    requestLocationPermission,
    requestBackgroundLocationPermission,
    requestCameraPermission,
    requestMediaLibraryPermission,
    requestActivityTrackingPermissions,
    checkLocationServices,
  };
}
