import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { SportType } from '../types/api';
import type { Ionicons } from '@expo/vector-icons';
import {
  convertApiGpsProfile,
  getGpsProfileBySlug,
  updateGpsProfileCache,
  type GpsProfile,
} from '../config/gpsProfiles';

// Map sport slugs/names to Ionicon names (lowercase keys for case-insensitive matching)
const SPORT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Running variants
  running: 'walk-outline',
  run: 'walk-outline',
  'trail-running': 'walk-outline',

  // Cycling variants
  cycling: 'bicycle-outline',
  bike: 'bicycle-outline',
  biking: 'bicycle-outline',
  'mountain-biking': 'bicycle-outline',
  'road-cycling': 'bicycle-outline',

  // Swimming
  swimming: 'water-outline',
  swim: 'water-outline',

  // Multi-sport
  triathlon: 'medal-outline',

  // Hiking/Walking
  hiking: 'trail-sign-outline',
  hike: 'trail-sign-outline',
  walking: 'walk-outline',
  walk: 'walk-outline',

  // Winter sports
  skiing: 'snow-outline',
  ski: 'snow-outline',
  'cross-country-skiing': 'snow-outline',
  snowboarding: 'snow-outline',
  skating: 'fitness-outline',

  // Gym/Fitness
  gym: 'barbell-outline',
  fitness: 'barbell-outline',
  workout: 'barbell-outline',
  yoga: 'body-outline',

  // Ball sports
  tennis: 'tennisball-outline',
  football: 'football-outline',
  soccer: 'football-outline',
  basketball: 'basketball-outline',

  // Default
  other: 'fitness-outline',
};

// Default icon for unknown sports
const DEFAULT_SPORT_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

// Fallback sports for when API is unavailable (gps_profile loaded from fallbacks)
const FALLBACK_SPORTS: SportTypeWithIcon[] = [
  { id: 1, name: 'Running', slug: 'running', icon: 'walk-outline', is_active: true },
  { id: 2, name: 'Cycling', slug: 'cycling', icon: 'bicycle-outline', is_active: true },
  { id: 3, name: 'Swimming', slug: 'swimming', icon: 'water-outline', is_active: true },
  { id: 4, name: 'Gym', slug: 'gym', icon: 'barbell-outline', is_active: true },
  { id: 5, name: 'Yoga', slug: 'yoga', icon: 'body-outline', is_active: true },
  { id: 6, name: 'Hiking', slug: 'hiking', icon: 'trail-sign-outline', is_active: true },
  { id: 7, name: 'Tennis', slug: 'tennis', icon: 'tennisball-outline', is_active: true },
  { id: 8, name: 'Football', slug: 'football', icon: 'football-outline', is_active: true },
  { id: 9, name: 'Basketball', slug: 'basketball', icon: 'basketball-outline', is_active: true },
  { id: 10, name: 'Other', slug: 'other', icon: 'fitness-outline', is_active: true },
];

export interface SportTypeWithIcon extends SportType {
  icon: keyof typeof Ionicons.glyphMap;
}

interface UseSportTypesResult {
  sportTypes: SportTypeWithIcon[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getSportById: (id: number) => SportTypeWithIcon | undefined;
  getSportBySlug: (slug: string) => SportTypeWithIcon | undefined;
  getGpsProfileForSport: (slugOrId: string | number) => GpsProfile;
}

// Cache for sport types to avoid refetching
let cachedSportTypes: SportTypeWithIcon[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSportTypes(): UseSportTypesResult {
  const [sportTypes, setSportTypes] = useState<SportTypeWithIcon[]>(
    cachedSportTypes || FALLBACK_SPORTS
  );
  const [isLoading, setIsLoading] = useState(!cachedSportTypes);
  const [error, setError] = useState<string | null>(null);

  const fetchSportTypes = useCallback(async (force = false) => {
    // Use cache if valid and not forcing refresh
    if (!force && cachedSportTypes && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setSportTypes(cachedSportTypes);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiSports = await api.getSportTypes();

      // Add icons to sports based on slug or API icon field
      const sportsWithIcons: SportTypeWithIcon[] = apiSports
        .filter((sport) => sport.is_active)
        .map((sport) => ({
          ...sport,
          icon: getIconForSport(sport),
        }));

      // Update cache
      cachedSportTypes = sportsWithIcons;
      cacheTimestamp = Date.now();

      // Update GPS profile static cache for background service
      updateGpsProfileCache(apiSports);

      setSportTypes(sportsWithIcons);
    } catch (err: any) {
      console.error('Failed to fetch sport types:', err);
      setError(err.message || 'Failed to load sports');
      // Use fallback sports on error
      setSportTypes(FALLBACK_SPORTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSportTypes();
  }, [fetchSportTypes]);

  const getSportById = useCallback(
    (id: number): SportTypeWithIcon | undefined => {
      return sportTypes.find((sport) => sport.id === id);
    },
    [sportTypes]
  );

  const getSportBySlug = useCallback(
    (slug: string): SportTypeWithIcon | undefined => {
      return sportTypes.find((sport) => sport.slug === slug);
    },
    [sportTypes]
  );

  const refetch = useCallback(async () => {
    await fetchSportTypes(true);
  }, [fetchSportTypes]);

  /**
   * Get GPS profile for a sport from API data or fallback to hardcoded profiles
   * @param slugOrId - Sport slug (string) or sport ID (number)
   * @returns GPS profile with camelCase properties
   */
  const getGpsProfileForSport = useCallback(
    (slugOrId: string | number): GpsProfile => {
      let sport: SportTypeWithIcon | undefined;

      // Find sport by slug or ID
      if (typeof slugOrId === 'string') {
        sport = sportTypes.find((s) => s.slug === slugOrId);
      } else {
        sport = sportTypes.find((s) => s.id === slugOrId);
      }

      // If sport found and has GPS profile from API, use it
      if (sport?.gps_profile) {
        return convertApiGpsProfile(sport.gps_profile);
      }

      // Fall back to hardcoded profiles
      const slug = typeof slugOrId === 'string' ? slugOrId : sport?.slug || 'other';
      return getGpsProfileBySlug(slug);
    },
    [sportTypes]
  );

  return {
    sportTypes,
    isLoading,
    error,
    refetch,
    getSportById,
    getSportBySlug,
    getGpsProfileForSport,
  };
}

/**
 * Get icon for a sport based on slug, name, or API icon field
 */
function getIconForSport(sport: SportType): keyof typeof Ionicons.glyphMap {
  // First try to use icon from API if it's a valid Ionicon name
  if (sport.icon && isValidIonicon(sport.icon)) {
    return sport.icon as keyof typeof Ionicons.glyphMap;
  }

  // Try slug-based mapping (case-insensitive)
  const slugLower = sport.slug?.toLowerCase();
  if (slugLower && SPORT_ICON_MAP[slugLower]) {
    return SPORT_ICON_MAP[slugLower];
  }

  // Try name-based mapping (case-insensitive)
  const nameLower = sport.name?.toLowerCase();
  if (nameLower && SPORT_ICON_MAP[nameLower]) {
    return SPORT_ICON_MAP[nameLower];
  }

  // Try partial match on name (e.g., "Road Running" matches "running")
  if (nameLower) {
    for (const [key, icon] of Object.entries(SPORT_ICON_MAP)) {
      if (nameLower.includes(key) || key.includes(nameLower)) {
        return icon;
      }
    }
  }

  console.log(`No icon found for sport: slug="${sport.slug}", name="${sport.name}" - using default`);
  return DEFAULT_SPORT_ICON;
}

/**
 * Check if a string is a valid Ionicon name
 */
function isValidIonicon(iconName: string): boolean {
  // Common Ionicon patterns
  return iconName.endsWith('-outline') || iconName.endsWith('-sharp') || !iconName.includes('-');
}

/**
 * Export fallback sports for use when API is not available
 */
export { FALLBACK_SPORTS };
