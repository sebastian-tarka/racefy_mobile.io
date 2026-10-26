import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RoutePreview } from '../../../components';
import { fixStorageUrl } from '../../../config/api';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { Activity, GpsTrack } from '../../../types/api';

type CheerPins = React.ComponentProps<typeof RoutePreview>['cheerPins'];

interface Props {
  activity: Activity;
  gpsTrack: GpsTrack;
  /** Animated height (250 ↔ 500) owned by the screen, which also locks scrolling. */
  mapHeightAnim: Animated.Value;
  isMapExpanded: boolean;
  onToggleExpand: () => void;
  /** Null when the viewer has nothing to be told about start/finish privacy. */
  gpsPrivacyLabel: string | null;
  /** Pins currently shown (empty when switched off). */
  cheerPins: CheerPins;
  /** Whether there are any cheers at all — the toggle shows only then. */
  hasCheers: boolean;
  showCheerPins: boolean;
  onToggleCheerPins: () => void;
  selectedCheerId: number | null;
  onSelectCheer: (id: number | null) => void;
}

/**
 * The activity's route map with its bottom row: GPS privacy note, expand,
 * km markers and the cheer-pins toggle. Cheer selection lives in the screen —
 * the live-messages card below selects pins too.
 */
export function ActivityDetailMap({
  activity,
  gpsTrack,
  mapHeightAnim,
  isMapExpanded,
  onToggleExpand,
  gpsPrivacyLabel,
  cheerPins,
  hasCheers,
  showCheerPins,
  onToggleCheerPins,
  selectedCheerId,
  onSelectCheer,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  /** Height of the bottom overlay row, so the cheer callout clears it. */
  const [mapOverlayHeight, setMapOverlayHeight] = useState(0);

  return (
    <Animated.View style={{ height: mapHeightAnim }}>
      <RoutePreview
        routePreviewUrl={fixStorageUrl(gpsTrack.route_preview_url)}
        routeMapUrl={fixStorageUrl(gpsTrack.route_map_url)}
        routeSvg={gpsTrack.route_svg}
        trackData={gpsTrack?.simplified_track}
        activityId={activity.id}
        height={isMapExpanded ? 500 : 250}
        enableZoom={isMapExpanded}
        showKmMarkers={showKmMarkers}
        showStartMarker={gpsTrack?.show_start_marker ?? true}
        showFinishMarker={gpsTrack?.show_finish_marker ?? true}
        startPoint={gpsTrack?.start_point ?? null}
        finishPoint={gpsTrack?.finish_point ?? null}
        cheerPins={cheerPins}
        selectedCheerId={selectedCheerId}
        onSelectCheer={onSelectCheer}
        calloutBottomInset={mapOverlayHeight + spacing.md}
      />
      {/* Everything that lives at the bottom of the map shares one
          row, so a long privacy label cannot collide with the
          controls and the cheer callout has a height to clear. */}
      <View
        style={styles.mapBottomOverlay}
        onLayout={(e) => setMapOverlayHeight(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        {/* GPS privacy — a pill with nothing to say used to render
            anyway, an icon taking room from the controls. */}
        {gpsPrivacyLabel ? (
          <View
            style={[
              styles.privacyIndicator,
              {
                backgroundColor: colors.cardBackground + '80',
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons
              name={activity.can_view_start_finish ? 'eye-outline' : 'shield-outline'}
              size={16}
              color={activity.is_owner ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.privacyText, { color: colors.textSecondary }]} numberOfLines={1}>
              {gpsPrivacyLabel}
            </Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.mapControlsRow}>
          <TouchableOpacity
            style={[styles.mapToggleButton, { backgroundColor: colors.cardBackground }]}
            onPress={onToggleExpand}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isMapExpanded ? 'contract-outline' : 'expand-outline'}
              size={20}
              color={colors.textPrimary}
            />
            <Text style={[styles.mapToggleText, { color: colors.textPrimary }]}>
              {isMapExpanded ? t('activityDetail.collapseMap') : t('activityDetail.expandMap')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.mapKmButton,
              {
                backgroundColor: showKmMarkers ? colors.primary : colors.cardBackground,
              },
            ]}
            onPress={() => setShowKmMarkers(!showKmMarkers)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flag-outline"
              size={16}
              color={showKmMarkers ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[
                styles.mapKmButtonText,
                { color: showKmMarkers ? '#ffffff' : colors.textSecondary },
              ]}
            >
              km
            </Text>
          </TouchableOpacity>
          {hasCheers && (
            <TouchableOpacity
              style={[
                styles.mapKmButton,
                {
                  backgroundColor: showCheerPins ? colors.primary : colors.cardBackground,
                },
              ]}
              onPress={onToggleCheerPins}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: showCheerPins }}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={showCheerPins ? '#ffffff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.mapKmButtonText,
                  { color: showCheerPins ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {t('live.archive.pins')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mapBottomOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mapControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapKmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 2,
  },
  mapKmButtonText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: spacing.xs,
  },
  mapToggleText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  privacyIndicator: {
    // Shrinks first: the controls next to it are actions, this is a label.
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  privacyText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
