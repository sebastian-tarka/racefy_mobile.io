/**
 * GPS tracking profiles for different activity types.
 * Each profile is optimized for the typical movement patterns and speeds of that activity.
 *
 * Profiles are matched by sport slug (from API) for flexibility.
 * New sports added via API will use the default profile unless a specific profile is defined.
 */

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
}

/**
 * Default GPS profile - used for unknown sports or as fallback
 */
export const DEFAULT_GPS_PROFILE: GpsProfile = {
  enabled: true,
  accuracyThreshold: 25,
  minDistanceThreshold: 3,
  maxRealisticSpeed: 15, // ~54 km/h
  minElevationChange: 3,
  timeInterval: 3000,
  distanceInterval: 5,
  smoothingBufferSize: 3,
};

/**
 * GPS profiles indexed by sport slug (matches API sport_type.slug)
 * This allows the backend to add new sports without requiring app updates.
 */
export const GPS_PROFILES_BY_SLUG: Record<string, GpsProfile> = {
  // Running: Medium speed, consistent movement, usually outdoors
  running: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 12, // ~43 km/h (fast sprint)
    minElevationChange: 3,
    timeInterval: 3000,
    distanceInterval: 5,
    smoothingBufferSize: 3,
  },

  // Cycling: Fast speed, covers more distance, smoother paths
  cycling: {
    enabled: true,
    accuracyThreshold: 20, // Better accuracy expected on open roads
    minDistanceThreshold: 5, // Larger movements OK
    maxRealisticSpeed: 30, // ~108 km/h (fast downhill)
    minElevationChange: 5, // Less sensitive to small changes
    timeInterval: 2000, // Faster updates for higher speeds
    distanceInterval: 8,
    smoothingBufferSize: 3,
  },

  // Swimming: GPS unreliable underwater
  swimming: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 3, // ~10 km/h
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 5,
  },

  // Gym: Indoor, no GPS signal
  gym: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 5,
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 3,
  },

  // Yoga: Indoor, stationary
  yoga: {
    enabled: false,
    accuracyThreshold: 50,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 2,
    minElevationChange: 0,
    timeInterval: 10000,
    distanceInterval: 10,
    smoothingBufferSize: 3,
  },

  // Hiking: Slow to medium speed, variable terrain, often in mountains/forests
  hiking: {
    enabled: true,
    accuracyThreshold: 30, // More tolerant (forests, valleys)
    minDistanceThreshold: 2, // Detect smaller steps
    maxRealisticSpeed: 8, // ~28 km/h (fast walking/light jog)
    minElevationChange: 5, // More significant elevation tracking
    timeInterval: 5000, // Slower updates OK
    distanceInterval: 5,
    smoothingBufferSize: 4, // More smoothing for variable terrain
  },

  // Tennis: Court-based, short bursts
  tennis: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 2,
    maxRealisticSpeed: 10, // ~36 km/h
    minElevationChange: 2,
    timeInterval: 2000,
    distanceInterval: 3,
    smoothingBufferSize: 2,
  },

  // Football: Field-based, running with breaks
  football: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 2,
    maxRealisticSpeed: 12, // ~43 km/h (sprint)
    minElevationChange: 2,
    timeInterval: 2000,
    distanceInterval: 3,
    smoothingBufferSize: 2,
  },

  // Basketball: Court-based, short intense movements
  basketball: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 2,
    maxRealisticSpeed: 10, // ~36 km/h
    minElevationChange: 2,
    timeInterval: 2000,
    distanceInterval: 3,
    smoothingBufferSize: 2,
  },

  // Walking: Slow speed, frequent stops, urban areas
  walking: {
    enabled: true,
    accuracyThreshold: 25, // Tighter accuracy to reduce drift
    minDistanceThreshold: 5, // Higher threshold to filter GPS drift when stationary
    maxRealisticSpeed: 4, // ~14 km/h max (brisk walking is ~6 km/h, fast walk ~8 km/h)
    minElevationChange: 3,
    timeInterval: 5000, // 5s updates
    distanceInterval: 5,
    smoothingBufferSize: 4, // More smoothing for slow movement
  },

  // Trail Running: Similar to running but more elevation tolerance
  'trail-running': {
    enabled: true,
    accuracyThreshold: 30, // More tolerant (forests, trails)
    minDistanceThreshold: 3,
    maxRealisticSpeed: 12, // ~43 km/h
    minElevationChange: 5, // More elevation changes on trails
    timeInterval: 3000,
    distanceInterval: 5,
    smoothingBufferSize: 4,
  },

  // Mountain Biking: Moderate speed, variable terrain
  'mountain-biking': {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 25, // ~90 km/h (downhill)
    minElevationChange: 5,
    timeInterval: 2000,
    distanceInterval: 8,
    smoothingBufferSize: 3,
  },

  // Road Cycling: Fast, smooth paths
  'road-cycling': {
    enabled: true,
    accuracyThreshold: 20,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 30, // ~108 km/h
    minElevationChange: 5,
    timeInterval: 2000,
    distanceInterval: 8,
    smoothingBufferSize: 3,
  },

  // Triathlon: Multi-sport, use balanced settings
  triathlon: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 30, // Cycling portion can be fast
    minElevationChange: 3,
    timeInterval: 2000,
    distanceInterval: 5,
    smoothingBufferSize: 3,
  },

  // Cross-Country Skiing: Moderate speed, winter terrain
  'cross-country-skiing': {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 15, // ~54 km/h
    minElevationChange: 5,
    timeInterval: 3000,
    distanceInterval: 5,
    smoothingBufferSize: 3,
  },

  // Skiing/Snowboarding: Fast downhill, variable terrain
  skiing: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 5,
    maxRealisticSpeed: 40, // ~144 km/h for downhill
    minElevationChange: 10,
    timeInterval: 2000,
    distanceInterval: 10,
    smoothingBufferSize: 3,
  },

  // Skating/Rollerblading
  skating: {
    enabled: true,
    accuracyThreshold: 25,
    minDistanceThreshold: 3,
    maxRealisticSpeed: 15, // ~54 km/h
    minElevationChange: 3,
    timeInterval: 2500,
    distanceInterval: 5,
    smoothingBufferSize: 3,
  },

  // Other/Generic: Default balanced settings
  other: {
    ...DEFAULT_GPS_PROFILE,
  },
};

/**
 * Get the GPS profile for a given sport slug
 */
export function getGpsProfileBySlug(slug: string): GpsProfile {
  const normalizedSlug = slug.toLowerCase();
  return GPS_PROFILES_BY_SLUG[normalizedSlug] || DEFAULT_GPS_PROFILE;
}

/**
 * Check if GPS tracking should be enabled for a sport slug
 */
export function isGpsEnabledForSportSlug(slug: string): boolean {
  const profile = getGpsProfileBySlug(slug);
  return profile.enabled;
}

// Legacy support: Get profile by sport ID (uses slug lookup internally)
// This requires the sport data to be available
import { getSportSlugById } from '../hooks/useSportTypes';

/**
 * Get the GPS profile for a given sport type ID
 * @deprecated Use getGpsProfileBySlug with the sport's slug instead
 */
export function getGpsProfile(sportTypeId: number): GpsProfile {
  const slug = getSportSlugById(sportTypeId);
  return getGpsProfileBySlug(slug);
}

/**
 * Check if GPS tracking should be enabled for a sport type
 * @deprecated Use isGpsEnabledForSportSlug with the sport's slug instead
 */
export function isGpsEnabledForSport(sportTypeId: number): boolean {
  const slug = getSportSlugById(sportTypeId);
  return isGpsEnabledForSportSlug(slug);
}
