import { api } from '../services/api';
import { useFetch } from './useFetch';
import type { NearbyRoute, PlannedRoute, User } from '../types/api';

interface MyPlannedRoutes {
  routes: NearbyRoute[];
  /**
   * The list is fetched once. Routes are created on a different screen (the
   * route library), so whoever shows this list has to ask for it again when the
   * athlete comes back — otherwise a route they just drew is missing.
   */
  refetch: () => void;
}

/**
 * A planned route in the shape the recording screen's route panel speaks
 * (NearbyRoute). `user` is the athlete when the route is theirs; a route from
 * someone else's library carries only its owner's id.
 */
export function plannedRouteToNearby(r: PlannedRoute, user: User | null): NearbyRoute {
  const own = user && user.id === r.user_id ? user : null;
  return {
    id: r.id,
    title: r.title,
    distance: r.distance,
    elevation_gain: r.elevation_gain,
    duration: r.estimated_duration,
    sport_type_id: r.sport_type_id,
    user: {
      id: r.user_id,
      name: own?.name ?? '',
      username: own?.username ?? '',
      avatar: (own as any)?.avatar ?? '',
    },
    distance_from_user: 0,
    stats: { likes_count: 0, completion_count: 0 },
    track_data: r.geometry,
    created_at: r.created_at,
    source: 'planned_route',
    // Index responses may omit turns — useRouteTurnInstructions fetches the detail then.
    turn_instructions: r.turn_instructions ?? [],
  } as unknown as NearbyRoute;
}

export function useMyPlannedRoutes(isAuthenticated: boolean, user: User | null): MyPlannedRoutes {
  const { data, refetch } = useFetch<NearbyRoute[]>(
    () =>
      api
        .getRoutes({ page: 1, per_page: 50 })
        .then((response) => response.data.map((r) => plannedRouteToNearby(r, user))),
    {
      enabled: isAuthenticated,
      deps: [isAuthenticated, user?.id],
      initialData: [],
      logCategory: 'api',
      errorMessage: 'Failed to fetch my planned routes',
    },
  );

  return { routes: data ?? [], refetch };
}
