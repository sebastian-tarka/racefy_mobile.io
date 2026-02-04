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
import { mapboxAnalytics } from '../services/mapboxAnalytics';
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

interface MapboxLiveMapProps {
  livePoints: GpsPoint[];
  currentPosition: {
    lat: number;
    lng: number;
  } | null;
  height?: number;
  gpsSignalQuality: 'good' | 'weak' | 'lost' | 'disabled';
  onMapReady?: () => void;
  followUser?: boolean;

  // Shadow track feature
  nearbyRoutes?: NearbyRoute[];
  shadowTrack?: GeoJSONLineString | null;
  selectedRouteId?: number | null;
  onRouteSelect?: (routeId: number) => void;
}

/**
 * MapboxLiveMap - Real-time GPS tracking map
 * Shows live route, user location with pulse animation, GPS signal indicator, and optional shadow track
 */
export function MapboxLiveMap({
  livePoints,
  currentPosition,
  height = 400,
  gpsSignalQuality,
  onMapReady,
  followUser = true,
  nearbyRoutes,
  shadowTrack,
  selectedRouteId,
  onRouteSelect,
}: MapboxLiveMapProps) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewLocation, setPreviewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // If MapboxGL is not available, return null
  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  // Fetch current location for preview when currentPosition is null (idle state)
  useEffect(() => {
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
          logger.warn('gps', 'Failed to get preview location', { error: err.message });
        });
    }
  }, [currentPosition, previewLocation]);

  // Use preview location if tracking hasn't started, otherwise use live position
  const displayPosition = currentPosition || previewLocation;

  // Build GeoJSON LineString from livePoints (only update when length changes for performance)
  const routeGeoJSON = useMemo(() => {
    if (livePoints.length === 0) return null;

    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: livePoints.map(p => [p.lng, p.lat]),
      },
    };
  }, [livePoints.length]);

  // Start pulse animation for user location marker
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Track map load for analytics
  useEffect(() => {
    if (displayPosition) {
      mapboxAnalytics.trackMapLoad(0); // Use 0 for live tracking (no activity ID yet)
    }
  }, [displayPosition]);

  // Handle map ready callback
  const onMapReadyInternal = () => {
    logger.debug('gps', 'Live map finished loading');
    mapReadyRef.current = true;

    // Fade out the loading overlay
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoading(false);
    });

    if (onMapReady) {
      onMapReady();
    }
  };

  // Select map style based on theme
  const mapStyle = isDark
    ? 'mapbox://styles/mapbox/navigation-night-v1'
    : MapboxGL.StyleURL.Outdoors;

  // GPS signal indicator color
  const getSignalColor = () => {
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
  const shadowTrackColor = isDark ? '#FFFFFF' : '#999999';

  // Show loading state while waiting for location
  if (!displayPosition) {
    return (
      <View style={[styles.container, { height, backgroundColor: colors.cardBackground }]}>
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
    <View style={[styles.container, { height, backgroundColor: colors.cardBackground }]}>
      <MapboxGL.MapView
        key={`mapbox-live-${isDark ? 'dark' : 'light'}`}
        style={styles.map}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassViewPosition={3}
        compassViewMargins={{ x: 16, y: 60 }}
        onDidFinishLoadingMap={onMapReadyInternal}
      >
        {/* Camera follows user position */}
        {displayPosition && followUser && (
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={[displayPosition.lng, displayPosition.lat]}
            zoomLevel={15}
            animationDuration={2000}
            animationMode="flyTo"
          />
        )}

        {/* Nearby routes polylines (idle state only) */}
        {nearbyRoutes?.map(route => (
          <MapboxGL.ShapeSource
            key={`nearby-${route.id}`}
            id={`nearby-route-${route.id}`}
            shape={{
              type: 'Feature',
              properties: {},
              geometry: route.track_data,
            }}
            onPress={() => onRouteSelect && onRouteSelect(route.id)}
          >
            <MapboxGL.LineLayer
              id={`nearby-line-${route.id}`}
              style={{
                lineColor: selectedRouteId === route.id ? colors.primary : colors.textMuted,
                lineWidth: selectedRouteId === route.id ? 3 : 2,
                lineOpacity: selectedRouteId === route.id ? 0.7 : 0.3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        ))}

        {/* Shadow track polyline (recording/paused state only) */}
        {shadowTrack && livePoints.length > 0 && (
          <MapboxGL.ShapeSource
            id="shadow-track"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: shadowTrack,
            }}
          >
            <MapboxGL.LineLayer
              id="shadow-line"
              style={{
                lineColor: shadowTrackColor,
                lineWidth: 3,
                lineOpacity: 0.4,
                lineDasharray: [1, 1],
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Live route polyline (only show when we have points) */}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="liveRoute" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="liveRouteLine"
              style={{
                lineColor: routeColor,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 1,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* User location marker with pulse animation and GPS signal indicator */}
        {displayPosition && (
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
            {/* GPS signal ring (pulsing) */}
            <MapboxGL.CircleLayer
              id="gpsSignalRing"
              style={{
                circleRadius: pulseAnim.interpolate({
                  inputRange: [1, 1.5],
                  outputRange: [15, 25],
                }),
                circleColor: signalColor,
                circleOpacity: pulseAnim.interpolate({
                  inputRange: [1, 1.5],
                  outputRange: [0.4, 0.1],
                }),
              }}
            />
            {/* User position marker */}
            <MapboxGL.CircleLayer
              id="userCircle"
              style={{
                circleRadius: 10,
                circleColor: colors.primary,
                circleStrokeWidth: 3,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}
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
