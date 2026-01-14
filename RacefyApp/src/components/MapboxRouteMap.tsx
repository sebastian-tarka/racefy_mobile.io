/**
 * MapboxRouteMap - Interactive Mapbox map with route overlay
 * ONLY USED WHEN @rnmapbox/maps IS INSTALLED
 *
 * This component is lazy-loaded by LeafletMap.tsx and won't cause errors
 * if @rnmapbox/maps is not installed.
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { mapboxAnalytics } from '../services/mapboxAnalytics';
import { logger } from '../services/logger';
import { useTheme } from '../hooks/useTheme';
import type { GeoJSONLineString } from '../types/api';

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
  // @rnmapbox/maps not installed - fallback to static images
  logger.debug('gps', 'Mapbox SDK not available - using static map images');
}

interface MapboxRouteMapProps {
  trackData: GeoJSONLineString;
  activityId: number;
  height?: number;
  backgroundColor?: string;
  initialZoom?: number;
}

/**
 * MapboxRouteMap - Interactive Mapbox map with route overlay
 * Provides native map interaction (zoom, pan) with GPS route displayed as a line
 * Reports usage to backend for cost tracking
 */
export function MapboxRouteMap({
  trackData,
  activityId,
  height = 250,
  backgroundColor,
  initialZoom = 13,
}: MapboxRouteMapProps) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // If MapboxGL is not available, return null
  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  // Use theme-appropriate background if not provided
  const bgColor = backgroundColor || colors.cardBackground;

  // Track map load for analytics/cost monitoring
  useEffect(() => {
    mapboxAnalytics.trackMapLoad(activityId);
  }, [activityId]);

  // Calculate map bounds from trackData
  const getBounds = () => {
    const coordinates = trackData.coordinates;
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    const lngs = coordinates.map((coord) => coord[0]);
    const lats = coordinates.map((coord) => coord[1]);

    return {
      ne: [Math.max(...lngs), Math.max(...lats)],
      sw: [Math.min(...lngs), Math.min(...lats)],
    };
  };

  const bounds = getBounds();

  // Fit camera to bounds when map is ready
  const fitMapBounds = () => {
    if (bounds && cameraRef.current) {
      logger.debug('gps', 'Fitting map bounds', { bounds });
      setTimeout(() => {
        cameraRef.current?.fitBounds(bounds.ne, bounds.sw, [40, 40, 40, 40], 500);
      }, 100);
    }
  };

  // Handle map ready callback
  const onMapReady = () => {
    logger.debug('gps', 'Map finished loading');
    mapReadyRef.current = true;
    fitMapBounds();

    // Fade out the loading overlay
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsLoading(false);
    });
  };

  // Re-fit bounds when height changes (only if map is already ready)
  useEffect(() => {
    if (mapReadyRef.current) {
      fitMapBounds();
    }
  }, [height]);

  const lineGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: trackData.coordinates,
    },
  };

  // Debug logging
  useEffect(() => {
    logger.debug('gps', 'MapboxRouteMap rendering', {
      coordinatesCount: trackData.coordinates.length,
      firstCoord: trackData.coordinates[0],
      lastCoord: trackData.coordinates[trackData.coordinates.length - 1],
      hasBounds: !!bounds,
    });
  }, [trackData, bounds]);

  // Use size category as key to force re-render on significant height changes
  const sizeCategory = height > 300 ? 'large' : 'small';

  // Reset map ready state and loading state when size category or theme changes
  useEffect(() => {
    mapReadyRef.current = false;
    setIsLoading(true);
    fadeAnim.setValue(1);
  }, [sizeCategory, isDark]);

  // Select map style based on theme
  const mapStyle = isDark ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Outdoors;

  // Theme-aware colors
  const routeColor = colors.primary; // Emerald green works in both themes
  const startMarkerColor = isDark ? '#34d399' : '#22c55e'; // Lighter green in dark mode
  const endMarkerColor = isDark ? '#f87171' : '#ef4444'; // Lighter red in dark mode

  return (
    <View style={[styles.container, { height, backgroundColor: bgColor }]}>
      <MapboxGL.MapView
        key={`mapbox-${activityId}-${sizeCategory}-${isDark ? 'dark' : 'light'}`}
        style={styles.map}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassViewPosition={3} // Top right
        compassViewMargins={{ x: 16, y: 60 }}
        onDidFinishLoadingMap={onMapReady}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={initialZoom}
          animationMode="flyTo"
          animationDuration={1000}
        />

         {/* Route line - must be rendered first to appear below markers */}
        <MapboxGL.ShapeSource id="routeSource" shape={lineGeoJSON}>
          <MapboxGL.LineLayer
            id="routeLine"
            style={{
              lineColor: routeColor,
              lineWidth: 4,
              lineCap: 'round',
              lineJoin: 'round',
              lineOpacity: 1,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Start marker - using ShapeSource + SymbolLayer for better performance */}
        {trackData.coordinates.length > 0 && (
          <MapboxGL.ShapeSource
            id="startPointSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: trackData.coordinates[0],
              },
              properties: {},
            }}
          >
            <MapboxGL.CircleLayer
              id="startCircle"
              style={{
                circleRadius: 10,
                circleColor: startMarkerColor,
                circleStrokeWidth: 3,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* End marker */}
        {trackData.coordinates.length > 1 && (
          <MapboxGL.ShapeSource
            id="endPointSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: trackData.coordinates[trackData.coordinates.length - 1],
              },
              properties: {},
            }}
          >
            <MapboxGL.CircleLayer
              id="endCircle"
              style={{
                circleRadius: 10,
                circleColor: endMarkerColor,
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
            { backgroundColor: bgColor, opacity: fadeAnim },
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
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  startMarker: {
    backgroundColor: '#22c55e', // Green for start
  },
  endMarker: {
    backgroundColor: '#ef4444', // Red for end
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});