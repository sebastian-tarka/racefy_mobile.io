import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';
import type { NearbyRoute, User } from '../types/api';

export function useMyPlannedRoutes(isAuthenticated: boolean, user: User | null): NearbyRoute[] {
  const [myRoutes, setMyRoutes] = useState<NearbyRoute[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMyRoutes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await api.getRoutes({ page: 1, per_page: 50 });
        if (cancelled) return;
        const converted: NearbyRoute[] = response.data.map((r) => ({
          id: r.id,
          title: r.title,
          distance: r.distance,
          elevation_gain: r.elevation_gain,
          duration: r.estimated_duration,
          sport_type_id: r.sport_type_id,
          user: {
            id: user?.id ?? r.user_id,
            name: user?.name ?? '',
            username: user?.username ?? '',
            avatar: (user as any)?.avatar ?? '',
          },
          distance_from_user: 0,
          stats: { likes_count: 0, completion_count: 0 },
          track_data: r.geometry,
          created_at: r.created_at,
        } as unknown as NearbyRoute));
        setMyRoutes(converted);
      } catch (err) {
        logger.debug('api', 'Failed to fetch my planned routes', { error: err });
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  return myRoutes;
}