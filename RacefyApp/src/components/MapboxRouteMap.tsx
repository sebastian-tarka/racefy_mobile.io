/**
 * MapboxRouteMap - Interactive Mapbox map with route overlay
 * ONLY USED WHEN @rnmapbox/maps IS INSTALLED
 *
 * This component is lazy-loaded by LeafletMap.tsx and won't cause errors
 * if @rnmapbox/maps is not installed.
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { mapboxAnalytics } from '../services/mapboxAnalytics';
import { colors } from '../theme';
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
  console.log('Mapbox SDK not available - using static map images');
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
  backgroundColor = colors.cardBackground,
  initialZoom = 13,
}: MapboxRouteMapProps) {
  const cameraRef = useRef<any>(null);

  // If MapboxGL is not available, return null
  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return null;
  }

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

  // Fit camera to bounds when map loads
  useEffect(() => {
    if (bounds && cameraRef.current) {
      setTimeout(() => {
        cameraRef.current?.fitBounds(bounds.ne, bounds.sw, [40, 40, 40, 40], 500);
      }, 100);
    }
  }, [bounds]);

  const lineGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: trackData.coordinates,
    },
  };

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Outdoors}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={true}
        compassViewPosition={3} // Top right
        compassViewMargins={{ x: 16, y: 60 }}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={initialZoom}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Route line */}
        <MapboxGL.ShapeSource id="routeSource" shape={lineGeoJSON}>
          <MapboxGL.LineLayer
            id="routeLine"
            style={{
              lineColor: colors.primary,
              lineWidth: 3,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Start marker */}
        {trackData.coordinates.length > 0 && (
          <MapboxGL.PointAnnotation
            id="startPoint"
            coordinate={trackData.coordinates[0]}
          >
            <View style={[styles.marker, styles.startMarker]}>
              <View style={styles.markerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* End marker */}
        {trackData.coordinates.length > 1 && (
          <MapboxGL.PointAnnotation
            id="endPoint"
            coordinate={trackData.coordinates[trackData.coordinates.length - 1]}
          >
            <View style={[styles.marker, styles.endMarker]}>
              <View style={styles.markerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>
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