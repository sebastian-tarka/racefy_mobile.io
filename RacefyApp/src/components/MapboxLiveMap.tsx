/**
 * MapboxLiveMap - Real-time GPS tracking map optimized for live activities
 * ONLY USED WHEN @rnmapbox/maps IS INSTALLED
 *
 * This component is lazy-loaded and won't cause errors if @rnmapbox/maps is not installed.
 * Shows live route polyline, user location marker, GPS signal indicator, and optional shadow track.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated, Text } from 'react-native';
import * as Location from 'expo-location';
import { logger } from '../services/logger';
import { useTheme } from '../hooks/useTheme';
import type { GpsPoint, GeoJSONLineString } from '../types/api';

// Conditional import - only loads if @rnmapbox/maps is installed
let MapboxGL: any = null;
let MAPBOX_ACCESS_TOKEN: string | null = null;

try {
  MapboxGL = require('@rnmapbox/maps').default;
  MAPBOX_ACCESS_TOKEN = require('../config/api').MAPBOX_ACCESS_TOKEN;

  // Initialize Mapbox with access token
  if (MAPBOX_ACCESS_TOKEN && MapboxGL) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch (e) {
  // @rnmapbox/maps not installed - fallback
  logger.debug('gps', 'Mapbox SDK not available for live map');
}

export interface NearbyRoute {
  id: number;
  title: string;
  distance: number;
  elevation_gain: number;
  duration: number;
  sport_type_id: number;
  user: {
    id: number;
    name: string;
    username: string;
    avatar: string;
  };
  stats: {
    likes_count: number;
    boosts_count: number;
  };
  track_data: GeoJSONLineString;
  distance_from_user: number;
  created_at: string;
}

/** Map style options for Mapbox */
export type MapStyleType = 'outdoors' | 'streets' | 'satellite';

export interface MapboxLiveMapProps {
  livePoints: GpsPoint[];
  currentPosition: {
    lat: number;
    lng: number;
  } | null;
  height?: number;
  gpsSignalQuality: 'good' | 'weak' | 'lost' | 'disabled';
  onMapReady?: () => void;
  followUser?: boolean;

  // Map style (outdoors/streets/satellite)
  mapStyle?: MapStyleType;

  // Shadow track feature
  nearbyRoutes?: NearbyRoute[];
  shadowTrack?: GeoJSONLineString | null;
  selectedRouteId?: number | null;
  onRouteSelect?: (route: NearbyRoute) => void;
}

/**
 * MapboxLiveMap - Real-time GPS tracking map
 * Shows live route, user location, GPS signal indicator, and optional shadow track
 */
export function MapboxLiveMap({
  livePoints,
  currentPosition,
  height,
  gpsSignalQuality,
  onMapReady,
  followUser = true,
  mapStyle: mapStyleProp = 'outdoors',
  nearbyRoutes,
  shadowTrack,
  selectedRouteId,
}: MapboxLiveMapProps) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const mapboxAvailable = !!MapboxGL && !!MAPBOX_ACCESS_TOKEN;

  // Fetch current location for preview when currentPosition is null (idle state)
  useEffect(() => {
    if (!mapboxAvailable) return;
    if (!currentPosition && !previewLocation) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(loc => {
          setPreviewLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude
          });
          logger.debug('gps', 'Preview location acquired', { lat: loc.coords.latitude, lng: loc.coords.longitude });
        })
        .catch(err => {
          logger.warn('gps', 'Failed to get preview location', { error: err?.message });
        });
    }
  }, [currentPosition, previewLocation, mapboxAvailable]);

  // Use preview location if tracking hasn't started, otherwise use live position
  const displayPosition = currentPosition || previewLocation;

  // Build GeoJSON LineString from livePoints (only update when length changes for performance)
  const routeGeoJSON = useMemo(() => {
    if (livePoints.length < 2) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: livePoints.map(p => [p.lng, p.lat]),
      },
    };
  }, [livePoints.length]);

  // Note: Map load analytics tracked by parent when activityId is available
  // No trackMapLoad(0) call here - activityId 0 is invalid and API rejects it

  // Validate nearby routes have proper track_data
  const validNearbyRoutes = useMemo(() => {
    if (!nearbyRoutes) return [];
    return nearbyRoutes.filter(route =>
      route?.track_data &&
      route.track_data.type === 'LineString' &&
      Array.isArray(route.track_data.coordinates) &&
      route.track_data.coordinates.length >= 2
    );
  }, [nearbyRoutes]);

  // Validate shadow track
  const validShadowTrack = useMemo(() => {
    if (!shadowTrack) return null;
    if (shadowTrack.type !== 'LineString') return null;
    if (!Array.isArray(shadowTrack.coordinates)) return null;
    if (shadowTrack.coordinates.length < 2) return null;
    return shadowTrack;
  }, [shadowTrack]);

  // If MapboxGL is not available, return null (after all hooks)
  if (!mapboxAvailable) {
    return null;
  }

  // Handle map ready callback
  const onMapReadyInternal = () => {
    logger.debug('gps', 'Live map finished loading');
    mapReadyRef.current = true;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoading(false);
    });

    onMapReady?.();
  };

  // Select map style URL based on prop and theme
  const getStyleURL = (): string => {
    if (mapStyleProp === 'satellite') {
      return MapboxGL.StyleURL?.Satellite || 'mapbox://styles/mapbox/satellite-v9';
    }
    if (mapStyleProp === 'streets') {
      return isDark
        ? 'mapbox://styles/mapbox/navigation-night-v1'
        : (MapboxGL.StyleURL?.Street || 'mapbox://styles/mapbox/streets-v12');
    }
    // outdoors (default)
    return isDark
      ? 'mapbox://styles/mapbox/dark-v11'
      : (MapboxGL.StyleURL?.Outdoors || 'mapbox://styles/mapbox/outdoors-v12');
  };

  const mapStyleURL = getStyleURL();

  // GPS signal indicator color
  const getSignalColor = (): string => {
    switch (gpsSignalQuality) {
      case 'good': return '#22c55e';
      case 'weak': return '#eab308';
      case 'lost': return '#ef4444';
      case 'disabled': return '#9ca3af';
      default: return colors.primary;
    }
  };

  const signalColor = getSignalColor();

  // Theme-aware colors
  const routeColor = isDark ? '#34d399' : colors.primary;
  const shadowTrackBorderColor = isDark ? '#1E3A8A' : '#1E40AF';
  const shadowTrackMainColor = isDark ? '#60A5FA' : '#3B82F6';

  // Show loading state while waiting for location
  if (!displayPosition) {
    return (
      <View style={[styles.container, height ? { height } : { flex: 1 }, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Getting your location...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, height ? { height } : { flex: 1 }, { backgroundColor: colors.cardBackground }]}>
      <MapboxGL.MapView
        key={`mapbox-live-${isDark ? 'dark' : 'light'}-${mapStyleProp}`}
        style={styles.map}
        styleURL={mapStyleURL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={onMapReadyInternal}
      >
        {/* Camera follows user position */}
        {followUser && (
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={[displayPosition.lng, displayPosition.lat]}
            zoomLevel={15}
            animationMode="none"
          />
        )}

        {/* All nearby routes as gray base layer */}
        {validNearbyRoutes.map(route => {
          const unselectedColor = isDark ? '#9CA3AF' : '#6B7280';
          return (
            <MapboxGL.ShapeSource
              key={`nearby-base-${route.id}`}
              id={`nearby-base-${route.id}`}
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: route.track_data.coordinates,
                },
              }}
            >
              <MapboxGL.LineLayer
                id={`nearby-base-line-${route.id}`}
                style={{
                  lineColor: unselectedColor,
                  lineWidth: 2.5,
                  lineOpacity: 0.6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>
          );
        })}

        {/* Selected route overlay (blue with border) - rendered on top */}
        {selectedRouteId && validNearbyRoutes.find(r => r.id === selectedRouteId) && (() => {
          const selected = validNearbyRoutes.find(r => r.id === selectedRouteId)!;
          return (
            <MapboxGL.ShapeSource
              id="selected-route-overlay"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: selected.track_data.coordinates,
                },
              }}
            >
              <MapboxGL.LineLayer
                id="selected-route-border"
                style={{
                  lineColor: shadowTrackBorderColor,
                  lineWidth: 8,
                  lineOpacity: 0.6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <MapboxGL.LineLayer
                id="selected-route-line"
                style={{
                  lineColor: shadowTrackMainColor,
                  lineWidth: 5,
                  lineOpacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>
          );
        })()}

        {/* Shadow track polyline with border (recording/paused state only) */}
        {validShadowTrack && livePoints.length > 0 && (
          <MapboxGL.ShapeSource
            id="shadow-track"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: validShadowTrack.coordinates,
              },
            }}
          >
            {/* Border/outline layer */}
            <MapboxGL.LineLayer
              id="shadow-border"
              style={{
                lineColor: shadowTrackBorderColor,
                lineWidth: 8,
                lineOpacity: 0.4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main shadow track line (dashed) */}
            <MapboxGL.LineLayer
              id="shadow-line"
              style={{
                lineColor: shadowTrackMainColor,
                lineWidth: 5,
                lineOpacity: 0.7,
                lineDasharray: [3, 2],
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Live route polyline (only show when we have 2+ points) */}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="liveRoute" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="liveRouteLine"
              style={{
                lineColor: routeColor || '#10b981',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 1,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* GPS signal ring - separate ShapeSource to avoid bridge issues with multiple CircleLayers */}
        <MapboxGL.ShapeSource
          id="gpsSignalSource"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [displayPosition.lng, displayPosition.lat],
            },
            properties: {},
          }}
        >
          <MapboxGL.CircleLayer
            id="gpsSignalRing"
            style={{
              circleRadius: 18,
              circleColor: signalColor || '#22c55e',
              circleOpacity: 0.25,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* User position dot - separate ShapeSource */}
        <MapboxGL.ShapeSource
          id="userLocation"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [displayPosition.lng, displayPosition.lat],
            },
            properties: {},
          }}
        >
          <MapboxGL.CircleLayer
            id="userCircle"
            style={{
              circleRadius: 10,
              circleColor: colors.primary || '#10b981',
              circleStrokeWidth: 3,
              circleStrokeColor: '#ffffff',
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>

      {/* Loading overlay with spinner */}
      {isLoading && (
        <Animated.View
          style={[
            styles.loadingOverlay,
            { backgroundColor: colors.cardBackground, opacity: fadeAnim },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
