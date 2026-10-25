/**
 * Place search for the event location picker — Mapbox Search v6 called straight
 * from the app with the public token, the same way the web SPA does
 * (resources/js/services/geocoding.js in racefy_api.io). The Racefy API has no
 * geocoding endpoint, so this is the one place we talk to a third party with
 * `fetch` instead of `api.request()`.
 */
import { MAPBOX_ACCESS_TOKEN } from '../config/api';
import { getAppLocale } from '../utils/dateFormat';
import { logger } from './logger';

const BASE_URL = 'https://api.mapbox.com/search/geocode/v6';
/** Mapbox needs a few letters before suggestions are worth a request. */
export const MIN_QUERY_LENGTH = 3;

export interface GeocodedPlace {
  id: string;
  /** Short name — "Park Skaryszewski". */
  name: string;
  /** Second line — "Warszawa, mazowieckie, Polska". */
  context: string;
  /** What goes into `location_name`. */
  label: string;
  latitude: number;
  longitude: number;
}

interface MapboxFeature {
  id?: string;
  properties: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  geometry?: { coordinates: [number, number] };
}

export function isGeocodingAvailable(): boolean {
  return !!MAPBOX_ACCESS_TOKEN;
}

function toPlace(feature: MapboxFeature): GeocodedPlace | null {
  const { properties } = feature;
  const lat = properties.coordinates?.latitude ?? feature.geometry?.coordinates[1];
  const lng = properties.coordinates?.longitude ?? feature.geometry?.coordinates[0];
  if (lat == null || lng == null) return null;
  const name = properties.name ?? properties.full_address ?? '';
  return {
    id: properties.mapbox_id ?? feature.id ?? `${lat},${lng}`,
    name,
    context: properties.place_formatted ?? '',
    label: properties.full_address ?? name,
    latitude: lat,
    longitude: lng,
  };
}

async function fetchFeatures(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<MapboxFeature[]> {
  if (!MAPBOX_ACCESS_TOKEN) return [];
  const query = new URLSearchParams({
    ...params,
    language: getAppLocale(),
    access_token: MAPBOX_ACCESS_TOKEN,
  });
  const response = await fetch(`${BASE_URL}/${path}?${query}`, { signal });
  if (!response.ok) {
    logger.warn('api', 'Mapbox geocoding failed', { path, status: response.status });
    return [];
  }
  const body = (await response.json()) as { features?: MapboxFeature[] };
  return body.features ?? [];
}

/** Suggestions for what the user typed, biased towards `proximity` (e.g. the map centre). */
export async function searchPlaces(
  text: string,
  {
    proximity,
    signal,
  }: { proximity?: { latitude: number; longitude: number }; signal?: AbortSignal } = {},
): Promise<GeocodedPlace[]> {
  const q = text.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const features = await fetchFeatures(
    'forward',
    {
      q,
      limit: '5',
      ...(proximity ? { proximity: `${proximity.longitude},${proximity.latitude}` } : {}),
    },
    signal,
  );
  return features.map(toPlace).filter((p): p is GeocodedPlace => p !== null);
}

/** Human name for a point — the label of the nearest address/place, or null. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const features = await fetchFeatures('reverse', {
      latitude: String(latitude),
      longitude: String(longitude),
      limit: '1',
    });
    const place = features[0] ? toPlace(features[0]) : null;
    return place?.label || null;
  } catch (error) {
    logger.warn('api', 'Mapbox reverse geocoding failed', { error });
    return null;
  }
}
