/**
 * GPS tracking profiles for different activity types.
 *
 * GPS profiles are now primarily fetched from the API via /sport-types endpoint.
 * This file provides:
 * - Type definitions for GPS profiles
 * - Conversion from API format (snake_case) to app format (camelCase)
 * - Fallback profiles when API data is unavailable
 * - Static getters for background location service (which can't use hooks)
 */

import type { GpsProfileApiResponse, GpsProfileRequest } from '../types/api';
import { logger } from '../services/logger';

// ============ TYPE DEFINITIONS ============

export interface GpsProfile {
  /** Whether GPS tracking is enabled for this activity type */
  enabled: boolean;
  /** Maximum acceptable GPS accuracy in meters - readings above this are rejected */
  accuracyThreshold: number;
  /** Minimum distance in meters to count as real movement (filters GPS drift) */
  minDistanceThreshold: number;
  /** Maximum realistic speed in m/s - faster readings are filtered as glitches */
  maxRealisticSpeed: number;
  /** Minimum elevation change in meters to count (filters altitude noise) */
  minElevationChange: number;
  /** Time interval between GPS updates in milliseconds */
  timeInterval: number;
  /** Distance interval for GPS updates in meters */
  distanceInterval: number;
  /** Number of points to average for GPS smoothing */
  smoothingBufferSize: number;
  /** Speed threshold in m/s below which user is considered stationary (default: 0.5 m/s = 1.8 km/h) */
  stationarySpeedThreshold: number;
}

// ============ VALIDATION ============

/** Valid ranges for GPS profile values */
const PROFILE_CONSTRAINTS = {
  accuracyThreshold: { min: 5, max: 100 },
  minDistanceThreshold: { min: 1, max: 50 },
  maxRealisticSpeed: { min: 1, max: 100 }, // 1-100 m/s (3.6-360 km/h)
  minElevationChange: { min: 0, max: 50 },
  timeInterval: { min: 1000, max: 30000 }, // 1-30 seconds
  distanceInterval: { min: 1, max: 50 },
  smoothingBufferSize: { min: 1, max: 10 },
  stationarySpeedThreshold: { min: 0.1, max: 3 }, // 0.1-3 m/s (0.36-10.8 km/h)
} as const;

/**
 * Validates a GPS profile value is within acceptable range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates and sanitizes a GPS profile from API
 */
function validateProfile(profile: GpsProfile): GpsProfile {
  return {
    enabled: profile.enabled,
    accuracyThreshold: clamp(
      profile.accuracyThreshold,
      PROFILE_CONSTRAINTS.accuracyThreshold.min,
      PROFILE_CONSTRAINTS.accuracyThreshold.max
    ),
    minDistanceThreshold: clamp(
      profile.minDistanceThreshold,
      PROFILE_CONSTRAINTS.minDistanceThreshold.min,
      PROFILE_CONSTRAINTS.minDistanceThreshold.max
    ),
    maxRealisticSpeed: clamp(
      profile.maxRealisticSpeed,
      PROFILE_CONSTRAINTS.maxRealisticSpeed.min,
      PROFILE_CONSTRAINTS.maxRealisticSpeed.max
    ),
    minElevationChange: clamp(
      profile.minElevationChange,
      PROFILE_CONSTRAINTS.minElevationChange.min,
      PROFILE_CONSTRAINTS.minElevationChange.max
    ),
    timeInterval: clamp(
      profile.timeInterval,
      PROFILE_CONSTRAINTS.timeInterval.min,
      PROFILE_CONSTRAINTS.timeInterval.max
    ),
    distanceInterval: clamp(
      profile.distanceInterval,
      PROFILE_CONSTRAINTS.distanceInterval.min,
      PROFILE_CONSTRAINTS.distanceInterval.max
    ),
    smoothingBufferSize: clamp(
      profile.smoothingBufferSize,
      PROFILE_CONSTRAINTS.smoothingBufferSize.min,
      PROFILE_CONSTRAINTS.smoothingBufferSize.max
    ),
    stationarySpeedThreshold: clamp(
      profile.stationarySpeedThreshold ?? 0.5, // Default to 0.5 if not provided
      PROFILE_CONSTRAINTS.stationarySpeedThreshold.min,
      PROFILE_CONSTRAINTS.stationarySpeedThreshold.max
    ),
  };
}

// ============ API CONVERSION ============

/**
 * Converts API GPS profile (snake_case) to app GPS profile (camelCase)
 * Also validates values are within acceptable ranges
 */
export function convertApiGpsProfile(apiProfile: GpsProfileApiResponse): GpsProfile {
  const profile: GpsProfile = {
    enabled: apiProfile.enabled,
    accuracyThreshold: apiProfile.accuracy_threshold,
    minDistanceThreshold: apiProfile.min_distance_threshold,
    maxRealisticSpeed: apiProfile.max_realistic_speed,
    minElevationChange: apiProfile.min_elevation_change,
    timeInterval: apiProfile.time_interval,
    distanceInterval: apiProfile.distance_interval,
    smoothingBufferSize: apiProfile.smoothing_buffer_size,
    // Use API value if available, otherwise default to 0.5 m/s
    stationarySpeedThreshold: (apiProfile as any).stationary_speed_threshold ?? 0.5,
  };

  return validateProfile(profile);
}

/**
 * Converts app GPS profile (camelCase) to API request format (snake_case)
 * Used when sending GPS profile to API on activity start
 */
export function convertToApiGpsProfile(profile: GpsProfile): GpsProfileRequest {
  return {
    enabled: profile.enabled,
    accuracy_threshold: profile.accuracyThreshold,
    min_distance_threshold: profile.minDistanceThreshold,
    max_realistic_speed: profile.maxRealisticSpeed,
    min_elevation_change: profile.minElevationChange,
    time_interval: profile.timeInterval,
    distance_interval: profile.distanceInterval,
    smoothing_buffer_size: profile.smoothingBufferSize,
  };
}

// ============ DEFAULT PROFILES ============

/**
 * Default GPS profile - used for unknown sports or new sports from API without GPS profile
 * Settings are permissive to work with any activity type
 */
export const DEFAULT_GPS_PROFILE: GpsProfile = {
  enabled: true,
  accuracyThreshold: 30,
  minDistanceThreshold: 3,
  maxRealisticSpeed: 20, // ~72 km/h - permissive to handle various activities
  minElevationChange: 3,
  timeInterval: 3000, // 3 seconds
  distanceInterval: 5,
  smoothingBufferSize: 3,
  stationarySpeedThreshold: 0.5, // 0.5 m/s = 1.8 km/h
};

/**
 * Essential fallback profiles by sport slug
 * These are used when API data is unavailable
 * Only includes sports with significantly different GPS requirements
 */
export const FALLBACK_GPS_PROFILES: Record<string, GpsProfile> = {
  // Outdoor GPS-enabled sports
  running: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 12, // ~43 km/h
    minElevationChange: 3,
    timeInterval: 3000,
    distanceInterval: 5,
    smoothingBufferSize: 3,
    stationarySpeedThreshold: 0.5,
  },
  cycling: {
    enabled: true,
    accuracyThreshold: 20,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 30, // ~108 km/h
    minElevationChange: 5,
    timeInterval: 2000,
    distanceInterval: 8,
    smoothingBufferSize: 3,
    stationarySpeedThreshold: 0.8, // Higher for cycling (technical terrain, slow starts)
  },
  walking: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 6, // ~21 km/h - matches API, allows for GPS noise
    minElevationChange: 3,
    timeInterval: 5000,
    distanceInterval: 5,
    smoothingBufferSize: 4,
    stationarySpeedThreshold: 0.3, // Lower for walking (slower activity)
  },
  hiking: {
    enabled: true,
    accuracyThreshold: 30,
    minDistanceThreshold: 2,
    maxRealisticSpeed: 8, // ~28 km/h
    minElevationChange: 5,
    timeInterval: 5000,
    distanceInterval: 5,
    smoothingBufferSize: 4,
    stationarySpeedThreshold: 0.3, // Lower for hiking (frequent stops, slow sections)
  },

  // Indoor/GPS-disabled sports
  swimming: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 3,
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 5,
    stationarySpeedThreshold: 0.5,
  },
  gym: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 5,
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 3,
    stationarySpeedThreshold: 0.5,
  },
  yoga: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 2,
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 3,
    stationarySpeedThreshold: 0.5,
  },
};

// ============ PROFILE GETTERS ============

/**
 * Get the fallback GPS profile for a given sport slug
 * Use this when API data is not available
 */
export function getGpsProfileBySlug(slug: string): GpsProfile {
  const normalizedSlug = slug.toLowerCase();
  return FALLBACK_GPS_PROFILES[normalizedSlug] || DEFAULT_GPS_PROFILE;
}

/**
 * Check if GPS tracking should be enabled for a sport slug (using fallback profiles)
 */
export function isGpsEnabledForSportSlug(slug: string): boolean {
  return getGpsProfileBySlug(slug).enabled;
}

// ============ STATIC CACHE FOR BACKGROUND SERVICE ============

/**
 * Static cache for GPS profiles from API
 * This allows the background location service to access profiles without hooks
 */
let cachedApiProfiles: Map<string, GpsProfile> = new Map();
let cachedSportIdToSlug: Map<number, string> = new Map();

/**
 * Update the static GPS profile cache (called from useSportTypes hook)
 * This enables background location service to use API profiles
 */
export function updateGpsProfileCache(
  sports: Array<{
    id: number;
    slug: string;
    gps_profile?: GpsProfileApiResponse;
  }>
): void {
  cachedApiProfiles.clear();
  cachedSportIdToSlug.clear();

  let cachedCount = 0;
  for (const sport of sports) {
    cachedSportIdToSlug.set(sport.id, sport.slug);
    if (sport.gps_profile) {
      const convertedProfile = convertApiGpsProfile(sport.gps_profile);
      cachedApiProfiles.set(sport.slug, convertedProfile);
      cachedCount++;
    }
  }

  logger.info('gps', 'GPS profile cache updated', {
    totalSports: sports.length,
    cachedProfiles: cachedCount,
    cachedSlugs: Array.from(cachedApiProfiles.keys()),
  });
}

/**
 * Get GPS profile from static cache (for background service)
 * Falls back to hardcoded profiles if not in cache
 *
 * @param slugOrId - Sport slug (string) or sport ID (number)
 */
export function getGpsProfileFromCache(slugOrId: string | number): GpsProfile {
  let slug: string;

  if (typeof slugOrId === 'number') {
    slug = cachedSportIdToSlug.get(slugOrId) || 'other';
  } else {
    slug = slugOrId;
  }

  // Try cached API profile first
  const cachedProfile = cachedApiProfiles.get(slug);
  if (cachedProfile) {
    return cachedProfile;
  }

  // Fall back to hardcoded profiles
  return getGpsProfileBySlug(slug);
}

/**
 * Check if GPS is enabled for a sport (using static cache)
 */
export function isGpsEnabledFromCache(slugOrId: string | number): boolean {
  return getGpsProfileFromCache(slugOrId).enabled;
}

/**
 * Clear the static cache (useful for testing or logout)
 */
export function clearGpsProfileCache(): void {
  cachedApiProfiles.clear();
  cachedSportIdToSlug.clear();
}