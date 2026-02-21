import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { usePermissions } from './usePermissions';
import { logger } from '../services/logger';

interface PreviewLocationResult {
  previewLocation: { lat: number; lng: number } | null;
  fetchingPreviewLocation: boolean;
}

/**
 * Fetches and caches the user's current location for map preview (before tracking starts).
 * Clears the cached location when tracking or pausing begins.
 */
export function usePreviewLocation(
  viewMode: 'stats' | 'map',
  isTracking: boolean,
  isPaused: boolean,
  currentPosition: { lat: number; lng: number } | null,
): PreviewLocationResult {
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingPreviewLocation, setFetchingPreviewLocation] = useState(false);
  const { requestActivityTrackingPermissions } = usePermissions();

  // Fetch preview location BEFORE showing map view (to avoid zoom effect)
  useEffect(() => {
    const fetchPreviewLocation = async () => {
      if (viewMode === 'map' && !isTracking && !isPaused && !currentPosition && !previewLocation && !fetchingPreviewLocation) {
        setFetchingPreviewLocation(true);
        logger.debug('activity', 'Pre-fetching location before showing map');

        try {
          const hasPermissions = await requestActivityTrackingPermissions();
          if (!hasPermissions) {
            logger.warn('activity', 'Location permissions denied for map preview');
            setFetchingPreviewLocation(false);
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setPreviewLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });

          logger.info('activity', 'Preview location cached for map view', {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        } catch (error: any) {
          logger.error('activity', 'Failed to fetch preview location', { error: error.message });
        } finally {
          setFetchingPreviewLocation(false);
        }
      }
    };

    fetchPreviewLocation();
  }, [viewMode, isTracking, isPaused, currentPosition, previewLocation, fetchingPreviewLocation, requestActivityTrackingPermissions]);

  // Clear preview location when starting to track
  useEffect(() => {
    if (isTracking || isPaused) {
      setPreviewLocation(null);
    }
  }, [isTracking, isPaused]);

  return { previewLocation, fetchingPreviewLocation };
}
