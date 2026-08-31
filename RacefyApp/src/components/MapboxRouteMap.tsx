/**
 * MapboxRouteMap - Interactive Mapbox map with route overlay
 * ONLY USED WHEN @rnmapbox/maps IS INSTALLED
 *
 * This component is lazy-loaded by LeafletMap.tsx and won't cause errors
 * if @rnmapbox/maps is not installed.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { mapboxAnalytics } from '../services/mapboxAnalytics';
import { logger } from '../services/logger';
import { useTheme } from '../hooks/useTheme';
import { useMapStyle } from '../hooks/useMapStyle';
import { fontSize } from '../theme';
import { haversineDistance as geoDistance } from '../utils/gpsMath';
import type { LiveMessagePin, GeoJSONLineString } from '../types/api';

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
  /** Optional — only used for analytics + caching key. Saved planned routes have no activity. */
  activityId?: number;
  height?: number;
  backgroundColor?: string;
  initialZoom?: number;
  showKmMarkers?: boolean;
  // GPS Privacy (new in 2026-01)
  showStartMarker?: boolean;
  showFinishMarker?: boolean;
  startPoint?: [number, number, number?] | null;
  finishPoint?: [number, number, number?] | null;
  /** Live messages pinned where the athlete was when each arrived (owner's finished activity). */
  cheerPins?: LiveMessagePin[];
  selectedCheerId?: number | null;
  /**
   * Space at the bottom of the map already taken by the host screen's own
   * overlays. The cheer callout is lifted above it instead of landing on top
   * of whatever is down there.
   */
  calloutBottomInset?: number;
  /** Tap on a pin (or its callout's close) — null clears the selection. */
  onSelectCheer?: (id: number | null) => void;
}

/**
 * Calculate distance in meters between two [lng, lat] coordinates using Haversine formula
 */
// Delegates to the shared utils/gpsMath helper. Coords are GeoJSON [lng, lat].
function haversineDistance(coord1: number[], coord2: number[]): number {
  return geoDistance(coord1[1], coord1[0], coord2[1], coord2[0]);
}

/**
 * Interpolate a point between two coordinates at a given fraction (0-1)
 */
function interpolateCoord(from: number[], to: number[], fraction: number): [number, number] {
  return [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction];
}

/**
 * Calculate points at each kilometer along the route
 */
function getKmMarkerPoints(coordinates: number[][]): GeoJSON.Feature[] {
  if (coordinates.length < 2) return [];

  const features: GeoJSON.Feature[] = [];
  let accumulatedDistance = 0;
  let nextKm = 1000; // first marker at 1km

  for (let i = 1; i < coordinates.length; i++) {
    const segmentDistance = haversineDistance(coordinates[i - 1], coordinates[i]);
    const prevAccumulated = accumulatedDistance;
    accumulatedDistance += segmentDistance;

    while (accumulatedDistance >= nextKm) {
      const overshoot = accumulatedDistance - nextKm;
      const segmentFraction = 1 - (segmentDistance > 0 ? overshoot / segmentDistance : 0);
      const point = interpolateCoord(coordinates[i - 1], coordinates[i], segmentFraction);
      const km = Math.round(nextKm / 1000);

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point },
        properties: { km: String(km) },
      });

      nextKm += 1000;
    }
  }

  return features;
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
  showKmMarkers = false,
  showStartMarker = true,
  showFinishMarker = true,
  startPoint = null,
  finishPoint = null,
  cheerPins = [],
  selectedCheerId = null,
  calloutBottomInset = 0,
  onSelectCheer,
}: MapboxRouteMapProps) {
  const { colors, isDark } = useTheme();
  const { resolveStyleUrl } = useMapStyle();
  const cameraRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Use theme-appropriate background if not provided
  const bgColor = backgroundColor || colors.cardBackground;

  // Track map load for analytics/cost monitoring (only when tied to an activity)
  useEffect(() => {
    if (activityId != null) mapboxAnalytics.trackMapLoad(activityId);
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

  // Fit camera to bounds when map is ready (no animation)
  const fitMapBounds = () => {
    if (bounds && cameraRef.current) {
      logger.debug('gps', 'Fitting map bounds', { bounds });
      setTimeout(() => {
        // Duration = 0 means no animation, instant fit
        cameraRef.current?.fitBounds(bounds.ne, bounds.sw, [40, 40, 40, 40], 0);
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

  // Resolve the map style: the user's Settings preference wins, otherwise the
  // admin dynamic dark/light style for the current device theme.
  const mapStyle = resolveStyleUrl(isDark);

  // Reset map ready state and loading state when the size category, theme, or
  // resolved style changes (the MapView is re-keyed below so it re-mounts).
  useEffect(() => {
    mapReadyRef.current = false;
    setIsLoading(true);
    fadeAnim.setValue(1);
  }, [sizeCategory, isDark, mapStyle]);

  // If MapboxGL is not available, render nothing. Placed AFTER all hooks so the
  // Rules of Hooks hold (every hook above runs unconditionally on each render).
  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  // Theme-aware colors - brighter in dark mode for better visibility
  const routeColor = isDark ? '#34d399' : colors.primary; // Brighter emerald in dark mode
  const startMarkerColor = isDark ? '#4ade80' : '#22c55e'; // Brighter green in dark mode
  const endMarkerColor = isDark ? '#fb7185' : '#ef4444'; // Warmer red in dark mode
  const kmMarkerColor = isDark ? '#34d399' : '#10b981'; // Emerald for km markers

  const cheerColor = isDark ? '#38bdf8' : '#0ea5e9'; // sky — distinct from km (emerald) and start/finish
  const cheerPinsGeoJSON: GeoJSON.FeatureCollection | null =
    cheerPins.length > 0
      ? {
          type: 'FeatureCollection',
          features: cheerPins.map((pin) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: pin.coordinate },
            properties: { id: pin.id, selected: pin.id === selectedCheerId },
          })),
        }
      : null;
  const selectedCheer = cheerPins.find((pin) => pin.id === selectedCheerId) ?? null;

  const onCheerPress = (event: { features?: GeoJSON.Feature[] }) => {
    const id = event.features?.[0]?.properties?.id;
    if (typeof id === 'number') onSelectCheer?.(id === selectedCheerId ? null : id);
  };

  // Compute km marker points
  const kmMarkersGeoJSON: GeoJSON.FeatureCollection | null = showKmMarkers
    ? {
        type: 'FeatureCollection',
        features: getKmMarkerPoints(trackData.coordinates),
      }
    : null;

  return (
    <View style={[styles.container, { height, backgroundColor: bgColor }]}>
      <MapboxGL.MapView
        key={`mapbox-${activityId}-${sizeCategory}-${mapStyle}`}
        style={styles.map}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={onMapReady}
      >
        <MapboxGL.Camera ref={cameraRef} zoomLevel={initialZoom} animationMode="none" />

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

        {/* Km markers */}
        {showKmMarkers && kmMarkersGeoJSON && kmMarkersGeoJSON.features.length > 0 && (
          <MapboxGL.ShapeSource id="kmMarkersSource" shape={kmMarkersGeoJSON}>
            <MapboxGL.CircleLayer
              id="kmMarkerCircles"
              style={{
                circleRadius: 11,
                circleColor: kmMarkerColor,
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
            <MapboxGL.SymbolLayer
              id="kmMarkerLabels"
              style={{
                textField: ['get', 'km'],
                textSize: 10,
                textColor: '#ffffff',
                textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Cheer pins — one circle per message with a position. The selected
            one grows; its text is shown in the callout below the map view
            rather than as a symbol layer, which would need map-style glyphs
            and would overlap on a busy route. */}
        {cheerPinsGeoJSON && (
          <MapboxGL.ShapeSource
            id="cheerPinsSource"
            shape={cheerPinsGeoJSON}
            hitbox={{ width: 28, height: 28 }}
            onPress={onCheerPress}
          >
            <MapboxGL.CircleLayer
              id="cheerPinCircles"
              style={{
                circleRadius: ['case', ['get', 'selected'], 12, 8],
                circleColor: cheerColor,
                circleStrokeWidth: ['case', ['get', 'selected'], 3, 2],
                circleStrokeColor: '#ffffff',
                circleOpacity: ['case', ['get', 'selected'], 1, 0.9],
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Start marker - only show if privacy allows */}
        {showStartMarker && startPoint && (
          <MapboxGL.ShapeSource
            id="startPointSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: startPoint,
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

        {/* Finish marker - only show if privacy allows */}
        {showFinishMarker && finishPoint && (
          <MapboxGL.ShapeSource
            id="endPointSource"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: finishPoint,
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

      {/* Callout for the selected cheer */}
      {selectedCheer && (
        <View
          style={[
            styles.cheerCallout,
            { backgroundColor: colors.cardBackground, bottom: 12 + calloutBottomInset },
          ]}
          accessibilityRole="text"
        >
          <View style={[styles.cheerCalloutDot, { backgroundColor: cheerColor }]} />
          <Text style={[styles.cheerCalloutText, { color: colors.textPrimary }]} numberOfLines={3}>
            <Text style={styles.cheerCalloutAuthor}>{selectedCheer.authorName} </Text>
            {selectedCheer.content}
          </Text>
          <TouchableOpacity
            onPress={() => onSelectCheer?.(null)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={[styles.cheerCalloutClose, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading overlay with spinner */}
      {isLoading && (
        <Animated.View
          style={[styles.loadingOverlay, { backgroundColor: bgColor, opacity: fadeAnim }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cheerCallout: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cheerCalloutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cheerCalloutText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.4,
  },
  cheerCalloutAuthor: {
    fontWeight: '600',
  },
  cheerCalloutClose: {
    fontSize: fontSize.md,
    paddingHorizontal: 4,
  },
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
