import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { NearbyRoute, User } from '../types/api';

export function useMyPlannedRoutes(isAuthenticated: boolean, user: User | null): NearbyRoute[] {
  const { data } = useFetch<NearbyRoute[]>(
    () =>
      api.getRoutes({ page: 1, per_page: 50 }).then((response) =>
        response.data.map(
          (r) =>
            ({
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
              source: 'planned_route',
              // Index responses may omit turns — useRouteTurnInstructions fetches the detail then.
              turn_instructions: r.turn_instructions ?? [],
            }) as unknown as NearbyRoute,
        ),
      ),
    {
      enabled: isAuthenticated,
      deps: [isAuthenticated, user?.id],
      initialData: [],
      logCategory: 'api',
      errorMessage: 'Failed to fetch my planned routes',
    },
  );

  return data ?? [];
}
