import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';
import { logger } from '../services/logger';

// Conditional import — only loads if @rnmapbox/maps is installed (native builds).
let MapboxGL: any = null;
let MAPBOX_ACCESS_TOKEN: string | null = null;
try {
  MapboxGL = require('@rnmapbox/maps').default;
  MAPBOX_ACCESS_TOKEN = require('../config/api').MAPBOX_ACCESS_TOKEN;
  if (MAPBOX_ACCESS_TOKEN && MapboxGL) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch {
  logger.debug('gps', 'Mapbox SDK not available for zone picker');
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface PrivacyZoneMapPickerProps {
  value: LatLng | null;
  onChange: (lat: number, lng: number) => void;
  radiusMeters?: number;
  height?: number;
}

/** Build a GeoJSON polygon approximating a circle of `radiusMeters` around a point. */
function circlePolygon(lat: number, lng: number, radiusMeters: number, steps = 48): any {
  const earth = 6378137;
  const dLat = (radiusMeters / earth) * (180 / Math.PI);
  const dLng = (radiusMeters / (earth * Math.cos((Math.PI * lat) / 180))) * (180 / Math.PI);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

/**
 * Interactive map for picking a privacy-zone centre. Tap anywhere to drop the
 * marker; a translucent ring shows the hidden radius. Falls back to a hint when
 * the native Mapbox SDK is unavailable (the caller still offers "use current
 * location").
 */
export function PrivacyZoneMapPicker({
  value,
  onChange,
  radiusMeters = 200,
  height = 240,
}: PrivacyZoneMapPickerProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const handlePress = useCallback(
    (event: any) => {
      const coordinates = event?.geometry?.coordinates;
      if (coordinates) {
        const [lng, lat] = coordinates;
        onChange(lat, lng);
      }
    },
    [onChange],
  );

  // Recenter the camera whenever the selected point changes (tap or "current location").
  useEffect(() => {
    if (!mapReady || !cameraRef.current || !value) return;
    cameraRef.current.setCamera({
      centerCoordinate: [value.lng, value.lat],
      zoomLevel: 14,
      animationDuration: 500,
    });
  }, [mapReady, value]);

  const radiusFeature = useMemo(
    () => (value ? circlePolygon(value.lat, value.lng, radiusMeters) : null),
    [value, radiusMeters],
  );
  const pointFeature = useMemo(
    () =>
      value
        ? {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [value.lng, value.lat] },
            properties: {},
          }
        : null,
    [value],
  );

  if (!MapboxGL || !MAPBOX_ACCESS_TOKEN) {
    return (
      <View
        style={[
          styles.fallback,
          { height, backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
      >
        <Ionicons name="map-outline" size={28} color={colors.textMuted} />
        <Text style={[styles.fallbackText, { color: colors.textMuted }]}>
          {t(
            'settings.privacyZones.mapUnavailable',
            'Map unavailable — use current location instead',
          )}
        </Text>
      </View>
    );
  }

  const mapStyle = isDark
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/outdoors-v12';

  return (
    <View style={[styles.container, { height, borderColor: colors.border }]}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={mapStyle}
        onPress={handlePress}
        onDidFinishLoadingMap={() => setMapReady(true)}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        <MapboxGL.Camera ref={cameraRef} zoomLevel={13} animationMode="none" />

        {radiusFeature && (
          <MapboxGL.ShapeSource id="zoneRadius" shape={radiusFeature}>
            <MapboxGL.FillLayer
              id="zoneRadiusFill"
              style={{ fillColor: colors.primary, fillOpacity: 0.14 }}
            />
            <MapboxGL.LineLayer
              id="zoneRadiusLine"
              style={{ lineColor: colors.primary, lineWidth: 2 }}
            />
          </MapboxGL.ShapeSource>
        )}

        {pointFeature && (
          <MapboxGL.ShapeSource id="zoneCenter" shape={pointFeature}>
            <MapboxGL.CircleLayer
              id="zoneCenterDot"
              style={{
                circleRadius: 7,
                circleColor: colors.primary,
                circleStrokeWidth: 3,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {!value && (
        <View pointerEvents="none" style={styles.hintOverlay}>
          <View style={[styles.hintPill, { backgroundColor: colors.cardBackground + 'ee' }]}>
            <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.textPrimary }]}>
              {t('settings.privacyZones.tapMapToSelect', 'Tap the map to place your zone')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    flex: 1,
  },
  fallback: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  fallbackText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  hintText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
