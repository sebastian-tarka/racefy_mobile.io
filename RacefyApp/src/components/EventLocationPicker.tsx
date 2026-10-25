import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';
import { logger } from '../services/logger';
import {
  GeocodedPlace,
  isGeocodingAvailable,
  MIN_QUERY_LENGTH,
  searchPlaces,
} from '../services/geocoding';
import type { GeoJSONLineString } from '../types/api';
import { Input } from './Input';
import { LocationMapModal, PickedLocation } from './LocationMapModal';

// Conditional import — only loads if @rnmapbox/maps is installed (native builds).
let MapboxGL: any = null;
let MAPBOX_ACCESS_TOKEN: string | null = null;
try {
  // Lazy on purpose: the native module is missing in Expo Go / web builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MapboxGL = require('@rnmapbox/maps').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MAPBOX_ACCESS_TOKEN = require('../config/api').MAPBOX_ACCESS_TOKEN;
  if (MAPBOX_ACCESS_TOKEN && MapboxGL) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch {
  logger.debug('gps', 'Mapbox SDK not available for event location picker');
}

export interface EventLocation {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface EventLocationPickerProps {
  value: EventLocation;
  /** Receives only the fields that changed — merge them into the form state. */
  onChange: (patch: Partial<EventLocation>) => void;
  /** Attached route: the location is its start and can't be edited here. */
  routeGeometry?: GeoJSONLineString | null;
  error?: string | string[] | null;
  disabled?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;
/** Nothing picked yet — show Poland, where most events are. */
const DEFAULT_CENTER: [number, number] = [19.4, 52.0];

/**
 * Event location: type to search (Mapbox suggestions), or tap the map preview
 * to place the pin on a full-screen map — the name then comes from reverse
 * geocoding. The preview itself is static: inside the form's ScrollView a live
 * map fought the scroll for every pan and pinch. With a route attached the
 * location is the route start, read-only, and the preview draws the course.
 * Mirrors EventLocationPicker.jsx in the web app.
 */
export function EventLocationPicker({
  value,
  onChange,
  routeGeometry,
  error,
  disabled,
}: EventLocationPickerProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodedPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  /** Only search after the user types — not when a pick or a map tap sets the text. */
  const [searchText, setSearchText] = useState<string | null>(null);

  const hasMap = !!MapboxGL && !!MAPBOX_ACCESS_TOKEN;
  const fromRoute = !!routeGeometry && routeGeometry.coordinates.length > 0;
  const hasPoint = value.latitude != null && value.longitude != null;

  useEffect(() => {
    if (searchText == null || searchText.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const places = await searchPlaces(searchText, {
          proximity: hasPoint
            ? { latitude: value.latitude!, longitude: value.longitude! }
            : undefined,
          signal: controller.signal,
        });
        setSuggestions(places);
      } catch (err) {
        if (!controller.signal.aborted) logger.warn('api', 'Place search failed', { error: err });
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Proximity is a hint only — re-searching when the pin moves isn't wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const handleChangeText = (text: string) => {
    onChange({ name: text });
    setSearchText(text);
  };

  const handleSelect = (place: GeocodedPlace) => {
    Keyboard.dismiss();
    setSearchText(null);
    setSuggestions([]);
    onChange({ name: place.label, latitude: place.latitude, longitude: place.longitude });
  };

  const canPickOnMap = !disabled && !fromRoute;

  const openMap = () => {
    Keyboard.dismiss();
    setSearchText(null);
    setSuggestions([]);
    setIsMapOpen(true);
  };

  const handleMapConfirm = (picked: PickedLocation) => {
    setIsMapOpen(false);
    onChange({
      latitude: picked.latitude,
      longitude: picked.longitude,
      ...(picked.name ? { name: picked.name } : {}),
    });
  };

  // Keep the camera on the route or the pin.
  useEffect(() => {
    if (!mapReady || !cameraRef.current) return;
    if (fromRoute) {
      const lngs = routeGeometry!.coordinates.map((c) => c[0]);
      const lats = routeGeometry!.coordinates.map((c) => c[1]);
      cameraRef.current.fitBounds(
        [Math.max(...lngs), Math.max(...lats)],
        [Math.min(...lngs), Math.min(...lats)],
        40,
        500,
      );
    } else if (hasPoint) {
      cameraRef.current.setCamera({
        centerCoordinate: [value.longitude, value.latitude],
        zoomLevel: 14,
        animationDuration: 500,
      });
    }
  }, [mapReady, fromRoute, routeGeometry, hasPoint, value.latitude, value.longitude]);

  const routeFeature = useMemo(
    () => (fromRoute ? { type: 'Feature', geometry: routeGeometry, properties: {} } : null),
    [fromRoute, routeGeometry],
  );
  const pointFeature = useMemo(
    () =>
      hasPoint
        ? {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [value.longitude, value.latitude] },
            properties: {},
          }
        : null,
    [hasPoint, value.latitude, value.longitude],
  );

  return (
    <View style={styles.container}>
      {fromRoute ? (
        <View>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {t('eventForm.location')}
          </Text>
          <View
            style={[
              styles.routeChip,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
          >
            <Ionicons name="flag-outline" size={18} color={colors.primary} />
            {!value.name ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.routeChipText, { color: colors.textPrimary }]} numberOfLines={2}>
                {value.name}
              </Text>
            )}
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('eventForm.locationFromRouteHint')}
          </Text>
        </View>
      ) : (
        <View>
          <Input
            label={t('eventForm.location')}
            placeholder={
              isGeocodingAvailable()
                ? t('eventForm.locationSearchPlaceholder')
                : t('eventForm.locationPlaceholder')
            }
            value={value.name}
            onChangeText={handleChangeText}
            error={error}
            leftIcon={isGeocodingAvailable() ? 'search-outline' : 'location-outline'}
            editable={!disabled}
            style={disabled ? { opacity: 0.6 } : undefined}
          />
          {isSearching && suggestions.length === 0 && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searching} />
          )}
          {suggestions.length > 0 && (
            <View
              style={[
                styles.suggestions,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              {suggestions.map((place, index) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => handleSelect(place)}
                  style={[
                    styles.suggestion,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                  ]}
                >
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                  <View style={styles.suggestionText}>
                    <Text
                      style={{ color: colors.textPrimary, fontSize: fontSize.md }}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    {!!place.context && (
                      <Text
                        style={{ color: colors.textMuted, fontSize: fontSize.sm }}
                        numberOfLines={1}
                      >
                        {place.context}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {hasMap && (
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          <MapboxGL.MapView
            style={styles.map}
            styleURL={
              isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/outdoors-v12'
            }
            onDidFinishLoadingMap={() => setMapReady(true)}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            attributionEnabled={false}
            logoEnabled={false}
            compassEnabled={false}
            scaleBarEnabled={false}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              centerCoordinate={DEFAULT_CENTER}
              zoomLevel={hasPoint ? 14 : 5}
              animationMode="none"
            />

            {routeFeature && (
              <MapboxGL.ShapeSource id="eventRoute" shape={routeFeature}>
                <MapboxGL.LineLayer
                  id="eventRouteLine"
                  style={{
                    lineColor: colors.primary,
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {pointFeature && (
              <MapboxGL.ShapeSource id="eventLocation" shape={pointFeature}>
                <MapboxGL.CircleLayer
                  id="eventLocationDot"
                  style={{
                    circleRadius: 8,
                    circleColor: colors.primary,
                    circleStrokeWidth: 3,
                    circleStrokeColor: '#ffffff',
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>

          {canPickOnMap && (
            // Above the map rather than its onPress: a static map may not report taps on every platform
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={openMap}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('eventForm.locationTapHint')}
            />
          )}
          {canPickOnMap && (
            <View pointerEvents="none" style={styles.hintOverlay}>
              <View style={[styles.hintPill, { backgroundColor: colors.cardBackground + 'ee' }]}>
                <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.textPrimary }]}>
                  {hasPoint ? t('eventForm.locationMoveHint') : t('eventForm.locationTapHint')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
      {hasMap && (
        <LocationMapModal
          visible={isMapOpen}
          MapboxGL={MapboxGL}
          initialCenter={hasPoint ? [value.longitude!, value.latitude!] : DEFAULT_CENTER}
          initialZoom={hasPoint ? 15 : 5}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleMapConfirm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  routeChipText: {
    flex: 1,
    fontSize: fontSize.md,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  searching: {
    marginBottom: spacing.sm,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    flex: 1,
  },
  mapContainer: {
    height: 220,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  map: {
    flex: 1,
  },
  hintOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    alignItems: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  hintText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
