import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { SportTypeWithIcon } from './useSportTypes';

export function useDefaultSport(
  sportTypes: SportTypeWithIcon[],
  isAuthenticated: boolean,
  sportsLoading: boolean,
): [SportTypeWithIcon | null, React.Dispatch<React.SetStateAction<SportTypeWithIcon | null>>] {
  const [selectedSport, setSelectedSport] = useState<SportTypeWithIcon | null>(null);

  useEffect(() => {
    if (sportTypes.length === 0 || selectedSport || sportsLoading) return;
    (async () => {
      if (isAuthenticated) {
        try {
          const preferences = await api.getPreferences();
          const favoriteSportId = preferences.activity_defaults.favorite_sport_id;
          if (favoriteSportId) {
            const favoriteSport = sportTypes.find(s => s.id === favoriteSportId);
            if (favoriteSport) {
              setSelectedSport(favoriteSport);
              return;
            }
          }
        } catch (error) {
          logger.debug('activity', 'Failed to load favorite sport preference, using fallback', { error });
        }
      }
      setSelectedSport(sportTypes[0]);
    })();
  }, [sportTypes, selectedSport, sportsLoading, isAuthenticated]);

  return [selectedSport, setSelectedSport];
}