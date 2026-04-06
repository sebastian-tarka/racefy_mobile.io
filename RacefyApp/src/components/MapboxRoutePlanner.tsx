/**
 * MapboxRoutePlanner - Interactive map for route planning
 * Tap to add waypoints, renders route polyline from Directions API preview
 */

import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';
import { logger } from '../services/logger';
import type { GeoJSONLineString, RouteWaypoint } from '../types/api';

// Conditional import - only loads if @rnmapbox/maps is installed
let MapboxGL: any = null;
let MAPBOX_ACCESS_TOKEN: string | null = null;

try {
  MapboxGL = require('@rnmapbox/maps').default;
  MAPBOX_ACCESS_TOKEN = require('../config/api').MAPBOX_ACCESS_TOKEN;

  if (MAPBOX_ACCESS_TOKEN && MapboxGL) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch (e) {
  logger.debug('gps', 'Mapbox SDK not available for route planner');
}

export type RoutePlannerMapStyle = 'outdoors' | 'streets' | 'satellite';

export interface MapboxRoutePlannerHandle {
  /** Fly the camera to the given coordinates. */
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface MapboxRoutePlannerProps {
  waypoints: RouteWaypoint[];
  routeGeometry: GeoJSONLineString | null;
  isLoadingPreview: boolean;
  onMapTap: (lat: number, lng: number) => void;
  onWaypointDrag?: (index: number, lat: number, lng: number) => void;
  /** Fixed height in px. Omit to let the component fill its parent (flex: 1). */
  height?: number;
  /** Initial map center. Used until the user adds waypoints. */
  initialCenter?: { lat: number; lng: number } | null;
  /** Map style variant. Defaults to 'outdoors'. */
  mapStyleType?: RoutePlannerMapStyle;
}

export const MapboxRoutePlanner = forwardRef<MapboxRoutePlannerHandle, MapboxRoutePlannerProps>(function MapboxRoutePlanner({
  waypoints,
  routeGeometry,
  isLoadingPreview,
  onMapTap,
  onWaypointDrag,
  height,
  initialCenter,
  mapStyleType = 'outdoors',
}, ref) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom: number = 15) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: zoom,
        animationDuration: 600,
      });
    },
  }), []);

  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.fallback, height ? { height } : { flex: 1 }, { backgroundColor: colors.cardBackground }]}>
        <Text style={{ color: colors.textSecondary }}>Mapbox not available</Text>
      </View>
    );
  }

  const handleMapPress = useCallback((event: any) => {
    const { geometry } = event;
    if (geometry?.coordinates) {
      const [lng, lat] = geometry.coordinates;
      onMapTap(lat, lng);
    }
  }, [onMapTap]);

  // Center on user location once when map first becomes ready (and there are no waypoints yet)
  const didInitialCenterRef = useRef(false);
  useEffect(() => {
    if (!mapReady || !cameraRef.current) return;
    if (didInitialCenterRef.current) return;
    if (waypoints.length > 0) return;
    if (!initialCenter) return;
    cameraRef.current.setCamera({
      centerCoordinate: [initialCenter.lng, initialCenter.lat],
      zoomLevel: 14,
      animationDuration: 600,
    });
    didInitialCenterRef.current = true;
  }, [mapReady, initialCenter, waypoints.length]);

  // Fit camera to all waypoints + route
  useEffect(() => {
    if (!mapReady || !cameraRef.current) return;

    if (routeGeometry && routeGeometry.coordinates.length > 1) {
      const coords = routeGeometry.coordinates;
      const lats = coords.map((c) => c[1]);
      const lngs = coords.map((c) => c[0]);
      cameraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        [60, 60, 60, 60],
        500
      );
    } else if (waypoints.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: [waypoints[0].lng, waypoints[0].lat],
        zoomLevel: 14,
        animationDuration: 500,
      });
    }
  }, [mapReady, waypoints.length, routeGeometry]);

  // Build waypoint markers GeoJSON
  const waypointFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: waypoints.map((wp, idx) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lng, wp.lat],
      },
      properties: {
        index: idx,
        label: wp.label || String(idx + 1),
        isFirst: idx === 0,
        isLast: idx === waypoints.length - 1,
      },
    })),
  };

  // Route line GeoJSON
  const routeFeature: GeoJSON.Feature | null = routeGeometry
    ? {
        type: 'Feature',
        geometry: routeGeometry,
        properties: {},
      }
    : null;

  const mapStyle =
    mapStyleType === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : mapStyleType === 'streets'
        ? 'mapbox://styles/mapbox/streets-v12'
        : isDark
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/outdoors-v12';

  const routeColor = isDark ? '#34d399' : '#10b981';
  const waypointColor = isDark ? '#60a5fa' : '#3b82f6';
  const startColor = isDark ? '#4ade80' : '#22c55e';
  const endColor = isDark ? '#fb7185' : '#ef4444';

  return (
    <View style={height ? { height } : { flex: 1 }}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={mapStyle}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => setMapReady(true)}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={13}
          animationMode="none"
        />

        {/* Route polyline */}
        {routeFeature && (
          <MapboxGL.ShapeSource id="plannerRoute" shape={routeFeature}>
            <MapboxGL.LineLayer
              id="plannerRouteLine"
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

        {/* Waypoint markers */}
        {waypoints.length > 0 && (
          <MapboxGL.ShapeSource id="plannerWaypoints" shape={waypointFeatures}>
            {/* Background circles */}
            <MapboxGL.CircleLayer
              id="waypointCircles"
              style={{
                circleRadius: 14,
                circleColor: [
                  'case',
                  ['get', 'isFirst'], startColor,
                  ['get', 'isLast'], waypoints.length > 1 ? endColor : startColor,
                  waypointColor,
                ],
                circleStrokeWidth: 3,
                circleStrokeColor: '#ffffff',
              }}
            />
            {/* Labels */}
            <MapboxGL.SymbolLayer
              id="waypointLabels"
              style={{
                textField: ['get', 'label'],
                textSize: 11,
                textColor: '#ffffff',
                textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Loading overlay */}
      {isLoadingPreview && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={routeColor} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: spacing.sm,
  },
});
