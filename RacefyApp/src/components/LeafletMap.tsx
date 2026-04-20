import React, {useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Image} from 'expo-image';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import {Ionicons} from '@expo/vector-icons';
import {SvgXml} from 'react-native-svg';
import {borderRadius, spacing} from '../theme';
import {MAPBOX_ACCESS_TOKEN} from '../config/api';
import {mapboxAnalytics} from '../services/mapboxAnalytics';
import {useTheme} from '../hooks/useTheme';
import {useViewability} from '../hooks/useViewability';
import type {GeoJSONLineString} from '../types/api';

// Lazy load MapboxRouteMap to avoid import errors if @rnmapbox/maps is not installed
let MapboxRouteMap: any = null;
try {
  MapboxRouteMap = require('./MapboxRouteMap').MapboxRouteMap;
} catch (e) {
  // @rnmapbox/maps not installed, will use fallback static images
}

interface RoutePreviewProps {
  routePreviewUrl?: string | null;
  routeMapUrl?: string | null;
  routeSvg?: string | null;
  trackData?: GeoJSONLineString | null;
  activityId?: number;
  height?: number;
  backgroundColor?: string;
  enableZoom?: boolean;
  showKmMarkers?: boolean;
  // GPS Privacy (new in 2026-01)
  showStartMarker?: boolean;
  showFinishMarker?: boolean;
  startPoint?: [number, number, number?] | null;
  finishPoint?: [number, number, number?] | null;
}

/**
 * RoutePreview - Displays activity route using:
 * 1. Interactive Mapbox map (trackData) - best experience, requires @rnmapbox/maps and token
 * 2. Pre-generated map image (routeMapUrl) - static Mapbox JPEG with map background
 * 3. Route preview PNG (routePreviewUrl) - transparent PNG with route line only
 * 4. SVG route (routeSvg) - last fallback, just the route path
 */
export function RoutePreview({
  routePreviewUrl,
  routeMapUrl,
  routeSvg,
  trackData,
  activityId,
  height = 250,
  backgroundColor,
  enableZoom = false,
  showKmMarkers = false,
  showStartMarker = true,
  showFinishMarker = true,
  startPoint = null,
  finishPoint = null,
}: RoutePreviewProps) {
  const { colors } = useTheme();

  // Use theme-appropriate background if not provided
  const bgColor = backgroundColor || colors.cardBackground;

  // Track static map usage when image is displayed
  useEffect(() => {
    if (routeMapUrl && activityId && !MAPBOX_ACCESS_TOKEN) {
      mapboxAnalytics.trackStaticMapView(activityId);
    }
  }, [routeMapUrl, activityId]);

  // Use interactive Mapbox if available and track data is provided.
  // activityId is optional — only required for analytics on the static fallback,
  // not for the interactive map itself (e.g. saved planned routes have no activityId).
  if (MAPBOX_ACCESS_TOKEN && MapboxRouteMap && trackData && trackData.coordinates.length > 0) {
    return (
      <MapboxRouteMap
        trackData={trackData}
        activityId={activityId}
        height={height}
        backgroundColor={bgColor}
        showKmMarkers={showKmMarkers}
        showStartMarker={showStartMarker}
        showFinishMarker={showFinishMarker}
        startPoint={startPoint}
        finishPoint={finishPoint}
      />
    );
  }
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const [baseScale, setBaseScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);

  const onPinchEvent = (event: PinchGestureHandlerGestureEvent) => {
    const newScale = baseScale * event.nativeEvent.scale;
    const clampedScale = Math.max(1, Math.min(newScale, 4));
    scale.setValue(clampedScale);
  };

  const onPinchStateChange = (event: PinchGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      const newScale = Math.max(1, Math.min(baseScale * event.nativeEvent.scale, 4));
      setLastScale(newScale);
      setBaseScale(newScale);

      if (newScale === 1) {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        setLastTranslateX(0);
        setLastTranslateY(0);
      }
    }
  };

  const onPanEvent = (event: PanGestureHandlerGestureEvent) => {
    if (lastScale > 1) {
      translateX.setValue(lastTranslateX + event.nativeEvent.translationX);
      translateY.setValue(lastTranslateY + event.nativeEvent.translationY);
    }
  };

  const onPanStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      setLastTranslateX(lastTranslateX + event.nativeEvent.translationX);
      setLastTranslateY(lastTranslateY + event.nativeEvent.translationY);
    }
  };

  const handleZoomIn = () => {
    const newScale = Math.min(baseScale + 0.5, 4);
    setLastScale(newScale);
    setBaseScale(newScale);

    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(baseScale - 0.5, 1);
    setLastScale(newScale);
    setBaseScale(newScale);

    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();

    if (newScale === 1) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
      setLastTranslateX(0);
      setLastTranslateY(0);
    }
  };

  const handleResetZoom = () => {
    setLastScale(1);
    setBaseScale(1);
    setLastTranslateX(0);
    setLastTranslateY(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
    ]).start();
  };

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
  };

  // Prefer full map image (Mapbox JPEG with map background) for best visual experience
  if (routeMapUrl) {
    const content = (
      <Animated.View style={[styles.imageWrapper, enableZoom && animatedStyle]}>
        <Image
          source={{ uri: routeMapUrl }}
          style={styles.mapImage}
          contentFit={enableZoom ? "contain" : "cover"}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    );

    return (
      <View style={[styles.container, { height, backgroundColor: bgColor }]}>
        {enableZoom ? (
          <>
            <PanGestureHandler
              onGestureEvent={onPanEvent}
              onHandlerStateChange={onPanStateChange}
              enabled={lastScale > 1}
            >
              <Animated.View style={{ flex: 1 }}>
                <PinchGestureHandler
                  onGestureEvent={onPinchEvent}
                  onHandlerStateChange={onPinchStateChange}
                >
                  <Animated.View style={{ flex: 1 }}>
                    {content}
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>

            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleZoomIn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleZoomOut}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleResetZoom}
                activeOpacity={0.7}
              >
                <Ionicons name="contract-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          content
        )}
      </View>
    );
  }

  // Route preview PNG (transparent background with route line) - fallback when no full map available
  if (routePreviewUrl) {
    return (
      <View style={[styles.container, { height, backgroundColor: bgColor }]}>
        <Image
          source={{ uri: routePreviewUrl }}
          style={styles.mapImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  // Fallback to SVG
  if (routeSvg) {
    let processedSvg = routeSvg;
    if (!routeSvg.includes('preserveAspectRatio')) {
      processedSvg = routeSvg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
    }

    const svgContent = (
      <Animated.View style={[styles.svgWrapper, enableZoom && animatedStyle]}>
        <SvgXml xml={processedSvg} width="100%" height="100%" />
      </Animated.View>
    );

    return (
      <View style={[styles.container, { height, backgroundColor: bgColor }]}>
        {enableZoom ? (
          <>
            <PanGestureHandler
              onGestureEvent={onPanEvent}
              onHandlerStateChange={onPanStateChange}
              enabled={lastScale > 1}
            >
              <Animated.View style={{ flex: 1 }}>
                <PinchGestureHandler
                  onGestureEvent={onPinchEvent}
                  onHandlerStateChange={onPinchStateChange}
                >
                  <Animated.View style={{ flex: 1 }}>
                    {svgContent}
                  </Animated.View>
                </PinchGestureHandler>
              </Animated.View>
            </PanGestureHandler>

            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleZoomIn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleZoomOut}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: colors.cardBackground }]}
                onPress={handleResetZoom}
                activeOpacity={0.7}
              >
                <Ionicons name="contract-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          svgContent
        )}
      </View>
    );
  }

  return null;
}

/**
 * LazyRoutePreview - Only renders the actual map/image when visible on screen.
 * Off-screen instances show a lightweight placeholder to prevent OOM.
 */
export function LazyRoutePreview(props: RoutePreviewProps) {
  const { colors } = useTheme();
  const { viewRef, isViewable } = useViewability({ threshold: 5, delay: 200 });
  const bgColor = props.backgroundColor || colors.cardBackground;

  if (!isViewable) {
    return (
      <View ref={viewRef} style={[styles.container, { height: props.height || 250, backgroundColor: bgColor }]}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={32} color={colors.textMuted || '#888'} />
        </View>
      </View>
    );
  }

  return <RoutePreview {...props} />;
}

// Backwards compatible alias
export function LeafletMap(props: RoutePreviewProps & { coordinates?: unknown; bounds?: unknown; strokeColor?: string; strokeWidth?: number }) {
  return <RoutePreview {...props} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  svgWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControls: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
