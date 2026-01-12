import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { api } from '../services/api';
import { logger } from '../services/logger';
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

// Fallback sport definitions (without names - names come from translations)
// These are used when API is unavailable - IDs should match API IDs
const FALLBACK_SPORT_DEFINITIONS: Array<{ id: number; slug: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 1, slug: 'running', icon: 'walk-outline' },
  { id: 2, slug: 'cycling', icon: 'bicycle-outline' },
  { id: 3, slug: 'swimming', icon: 'water-outline' },
  { id: 4, slug: 'gym', icon: 'barbell-outline' },
  { id: 5, slug: 'yoga', icon: 'body-outline' },
  { id: 6, slug: 'hiking', icon: 'trail-sign-outline' },
  { id: 7, slug: 'walking', icon: 'walk-outline' },
  { id: 8, slug: 'tennis', icon: 'tennisball-outline' },
  { id: 9, slug: 'football', icon: 'football-outline' },
  { id: 10, slug: 'basketball', icon: 'basketball-outline' },
  { id: 99, slug: 'other', icon: 'fitness-outline' },
];

// Function to get fallback sports with translated names
function getFallbackSports(t: (key: string) => string): SportTypeWithIcon[] {
  return FALLBACK_SPORT_DEFINITIONS.map((sport) => ({
    ...sport,
    name: t(`sports.${sport.slug}`),
    is_active: true,
  }));
}

// Legacy export for backwards compatibility (English names)
const FALLBACK_SPORTS: SportTypeWithIcon[] = FALLBACK_SPORT_DEFINITIONS.map((sport) => ({
  ...sport,
  name: sport.slug.charAt(0).toUpperCase() + sport.slug.slice(1), // Capitalize slug as fallback
  is_active: true,
}));

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
let cachedLanguage: string | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to invalidate cache (called when language changes)
export function invalidateSportTypesCache() {
  cachedSportTypes = null;
  cacheTimestamp = 0;
  cachedLanguage = null;
  logger.info('general', 'Sport types cache invalidated');
}

export function useSportTypes(): UseSportTypesResult {
  const { t, i18n: i18nInstance } = useTranslation();
  const currentLanguage = i18nInstance.language;

  // Get translated fallback sports
  const translatedFallbackSports = getFallbackSports(t);

  const [sportTypes, setSportTypes] = useState<SportTypeWithIcon[]>(
    cachedSportTypes || translatedFallbackSports
  );
  const [isLoading, setIsLoading] = useState(!cachedSportTypes);
  const [error, setError] = useState<string | null>(null);

  // Track if this is the first render
  const isFirstRender = useRef(true);
  const previousLanguage = useRef(currentLanguage);

  const fetchSportTypes = useCallback(async (force = false) => {
    const lang = i18n.language || 'en';

    // Use cache if valid, not forcing refresh, and language hasn't changed
    if (!force && cachedSportTypes && cachedLanguage === lang && Date.now() - cacheTimestamp < CACHE_DURATION) {
      logger.debug('general', 'Using cached sport types', { count: cachedSportTypes.length, language: lang });
      setSportTypes(cachedSportTypes);
      setIsLoading(false);
      return;
    }

    logger.info('general', 'Fetching sport types from API', { language: lang });
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

      // Update cache with language tag
      cachedSportTypes = sportsWithIcons;
      cacheTimestamp = Date.now();
      cachedLanguage = lang;

      // Update GPS profile static cache for background service
      updateGpsProfileCache(apiSports);

      logger.info('general', 'Sport types loaded', {
        count: sportsWithIcons.length,
        withGpsProfiles: apiSports.filter(s => s.gps_profile).length,
        language: lang,
      });

      setSportTypes(sportsWithIcons);
    } catch (err: any) {
      logger.error('general', 'Failed to fetch sport types', { error: err.message });
      setError(err.message || 'Failed to load sports');
      // Use translated fallback sports on error
      setSportTypes(translatedFallbackSports);
    } finally {
      setIsLoading(false);
    }
  }, [translatedFallbackSports]);

  // Initial fetch
  useEffect(() => {
    fetchSportTypes();
  }, [fetchSportTypes]);

  // Refetch when language changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousLanguage.current = currentLanguage;
      return;
    }

    if (previousLanguage.current !== currentLanguage) {
      logger.info('general', 'Language changed, refetching sport types', {
        from: previousLanguage.current,
        to: currentLanguage,
      });
      previousLanguage.current = currentLanguage;

      // Invalidate cache and refetch with new language
      invalidateSportTypesCache();
      fetchSportTypes(true);
    }
  }, [currentLanguage, fetchSportTypes]);

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
   * Get GPS profile for a sport from API data or fallback to default profile
   * Priority: 1) API gps_profile, 2) Hardcoded profile by slug, 3) DEFAULT_GPS_PROFILE
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

      // If sport found and has GPS profile from API, use it (preferred)
      if (sport?.gps_profile) {
        logger.debug('gps', 'Using API GPS profile', {
          sportId: sport.id,
          slug: sport.slug,
          maxRealisticSpeed: sport.gps_profile.max_realistic_speed,
        });
        return convertApiGpsProfile(sport.gps_profile);
      }

      // If sport found but no API profile, try hardcoded profile by slug
      if (sport?.slug) {
        const fallbackProfile = getGpsProfileBySlug(sport.slug);
        logger.debug('gps', 'Using hardcoded GPS profile for slug', {
          sportId: sport.id,
          slug: sport.slug,
          maxRealisticSpeed: fallbackProfile.maxRealisticSpeed,
        });
        return fallbackProfile;
      }

      // Sport not found - use default profile
      // This can happen if sport types not loaded yet or unknown sport ID
      logger.warn('gps', 'Sport not found, using default GPS profile', {
        slugOrId,
        sportTypesLoaded: sportTypes.length,
      });
      return getGpsProfileBySlug('other');
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

  logger.debug('general', `No icon found for sport: slug="${sport.slug}", name="${sport.name}" - using default`);
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
