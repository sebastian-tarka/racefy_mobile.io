/**
 * Stable identity for a shadow-track candidate.
 *
 * Routes on the recording screen come from different tables — `/activities/nearby`
 * (activity ids), `/routes` (planned-route ids), event routes — so a bare numeric
 * `id` collides across sources. Use this key for dedup, list keys, "is selected"
 * checks and per-route caches.
 */
export type RouteSource = 'activity' | 'planned_route' | 'event';

export interface RouteIdentity {
  id: number;
  source?: RouteSource;
}

export function routeKey(route: RouteIdentity): string {
  return `${route.source ?? 'activity'}:${route.id}`;
}
