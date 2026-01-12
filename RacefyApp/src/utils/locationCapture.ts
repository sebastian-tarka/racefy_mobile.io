import * as Location from 'expo-location';
import type { ActivityLocation } from '../types/api';
import { logger } from '../services/logger';

/**
 * Captures current location with reverse geocoding.
 * Returns null gracefully on any failure - never blocks activity flow.
 */
export async function captureActivityLocation(): Promise<ActivityLocation | null> {
  try {
    // Check if we already have location permission (granted for GPS tracking)
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      // Try requesting if not granted
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        logger.gps('Location permission denied for activity capture');
        return null;
      }
    }

    // Get current position
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;

    // Try reverse geocoding
    let city: string | undefined;
    let region: string | undefined;
    let country: string | undefined;
    let countryCode: string | undefined;
    let locationName: string | undefined;

    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geocoded && geocoded.length > 0) {
        const result = geocoded[0];
        city = result.city ?? undefined;
        region = result.region ?? undefined;
        country = result.country ?? undefined;
        countryCode = result.isoCountryCode ?? undefined;

        // Build location name from available parts
        const parts = [city, country].filter(Boolean);
        locationName = parts.length > 0 ? parts.join(', ') : undefined;
      }
    } catch (geocodeError) {
      // Geocoding failed, but we still have coordinates
      logger.warn('gps', 'Reverse geocoding failed', { error: geocodeError });
    }

    return {
      latitude,
      longitude,
      city,
      region,
      country,
      country_code: countryCode,
      location_name: locationName,
    };
  } catch (error) {
    logger.warn('gps', 'Failed to capture activity location', { error });
    return null;
  }
}
