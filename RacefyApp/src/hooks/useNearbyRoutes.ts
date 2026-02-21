import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { NearbyRoute } from '../types/api';
import { api } from '../services/api';
import { logger } from '../services/logger';

interface UseNearbyRoutesResult {
  nearbyRoutes: NearbyRoute[];
  selectedShadowTrack: NearbyRoute | null;
  loadingRoutes: boolean;
  routesError: string | null;
  handleRouteSelect: (route: NearbyRoute) => void;
  handleClearShadowTrack: () => void;
}

/**
 * Manages nearby routes fetching, selection, and shadow track state.
 * Fetches routes when a sport is selected and position is available.
 * Resets when sport changes or when re-entering map view.
 */
export function useNearbyRoutes(
  selectedSportId: number | undefined,
  currentPosition: { lat: number; lng: number } | null,
  previewLocation: { lat: number; lng: number } | null,
  viewMode: 'stats' | 'map',
): UseNearbyRoutesResult {
  const { t } = useTranslation();
  const [nearbyRoutes, setNearbyRoutes] = useState<NearbyRoute[]>([]);
  const [selectedShadowTrack, setSelectedShadowTrack] = useState<NearbyRoute | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const routesFetchedRef = useRef(false);

  // Fetch nearby routes when sport is selected and we have position
  useEffect(() => {
    const fetchNearbyRoutes = async () => {
      const position = currentPosition || previewLocation;

      logger.debug('activity', 'Routes fetch check', {
        alreadyFetched: routesFetchedRef.current,
        isLoading: loadingRoutes,
        hasSelectedSport: !!selectedSportId,
        hasPosition: !!position,
        hasCurrent: !!currentPosition,
        hasPreview: !!previewLocation,
      });

      // Skip if already fetched or currently fetching
      if (routesFetchedRef.current || loadingRoutes) {
        logger.debug('activity', 'Skipping routes fetch - already fetched or loading');
        return;
      }

      // Fetch when sport is selected AND we have a position
      if (selectedSportId && position) {
        routesFetchedRef.current = true; // Mark as fetched BEFORE starting
        setLoadingRoutes(true);
        setRoutesError(null);

        try {
          logger.debug('activity', 'Fetching nearby routes', { lat: position.lat, lng: position.lng, sportId: selectedSportId });
          const routes = await api.getNearbyRoutes(position.lat, position.lng, 5000, selectedSportId, 10);
          setNearbyRoutes(routes);
          logger.info('activity', 'Nearby routes fetched successfully', { count: routes.length });
        } catch (error: any) {
          setRoutesError(error.message || t('recording.routesError'));
          logger.error('activity', 'Failed to fetch nearby routes', { error });
        } finally {
          setLoadingRoutes(false);
        }
      } else {
        logger.debug('activity', 'Not fetching routes - missing sport or position');
      }
    };

    fetchNearbyRoutes();
  }, [selectedSportId, currentPosition, previewLocation, loadingRoutes]);

  // Reset routes when sport changes
  useEffect(() => {
    setNearbyRoutes([]);
    routesFetchedRef.current = false;
  }, [selectedSportId]);

  // Reset fetch flag when entering map view
  useEffect(() => {
    if (viewMode === 'map') {
      routesFetchedRef.current = false;
    }
  }, [viewMode]);

  const handleRouteSelect = useCallback((route: NearbyRoute) => {
    setSelectedShadowTrack(route);
    logger.activity('Shadow track selected', { routeId: route.id, title: route.title });
  }, []);

  const handleClearShadowTrack = useCallback(() => {
    setSelectedShadowTrack(null);
    logger.activity('Shadow track cleared');
  }, []);

  return {
    nearbyRoutes,
    selectedShadowTrack,
    loadingRoutes,
    routesError,
    handleRouteSelect,
    handleClearShadowTrack,
  };
}
