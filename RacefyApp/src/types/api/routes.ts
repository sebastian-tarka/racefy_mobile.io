import type { GeoJSONLineString } from './activities';
import type { SportType } from './sports';

// ============ PLANNED ROUTES ============

export interface RouteWaypoint {
  lat: number;
  lng: number;
  label?: string; // e.g., "Start", "Water Station", "Finish"
}

export interface RouteElevationPoint {
  distance: number; // meters from start
  elevation: number; // meters
}

export interface RouteTurnInstruction {
  distance_along: number; // meters from start where turn occurs
  maneuver: string; // 'turn-left', 'turn-right', 'straight', 'u-turn', etc.
  instruction: string; // Human-readable: "Turn left onto Main St"
  location: [number, number]; // [lng, lat]
}

export interface PlannedRoute {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  sport_type_id: number;
  profile: 'walking' | 'cycling';
  waypoints: RouteWaypoint[];
  geometry: GeoJSONLineString;
  distance: number; // meters
  estimated_duration: number; // seconds
  elevation_gain: number; // meters
  elevation_loss: number; // meters
  elevation_profile: RouteElevationPoint[];
  turn_instructions: RouteTurnInstruction[];
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar: string;
  };
  sport_type?: SportType;
}

export interface CreateRouteRequest {
  title: string;
  description?: string;
  sport_type_id: number;
  profile: 'walking' | 'cycling';
  waypoints: RouteWaypoint[];
  is_public?: boolean;
}

export interface UpdateRouteRequest {
  title?: string;
  description?: string;
  waypoints?: RouteWaypoint[];
  profile?: 'walking' | 'cycling';
  is_public?: boolean;
}

export interface RouteSearchParams {
  lat?: number;
  lng?: number;
  radius?: number; // meters
  sport_type_id?: number;
  query?: string;
  page?: number;
  per_page?: number;
}

export interface RoutePreviewRequest {
  waypoints: RouteWaypoint[];
  profile: 'walking' | 'cycling';
}

export interface RoutePreviewResponse {
  geometry: GeoJSONLineString;
  distance: number;
  estimated_duration: number;
  elevation_gain: number;
  elevation_loss: number;
  elevation_profile: RouteElevationPoint[];
  turn_instructions: RouteTurnInstruction[];
}
