import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../../../theme';
import type { GeoJSONLineString, GpsPoint, NearbyRoute } from '../../../types/api';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { TrackingStatus } from '../../../hooks/useLiveActivity';
import { LivePulse, MapboxLiveMap } from '../../../components';
import type { MapStyleType } from '../../../components/MapboxLiveMap';

/** The route layer paints planned routes in blue — the design's own accent. */
const ROUTE_BLUE = '#2563EB';

interface IdleViewProps {
  selectedSport: SportTypeWithIcon | null;
  /** The sports on the rail. Everything else lives behind "All sports". */
  shortcutSports: SportTypeWithIcon[];
  sportsLoading: boolean;
  isLoading: boolean;
  gpsSignal: TrackingStatus['gpsSignal'] | null;
  currentPosition: { lat: number; lng: number } | null;
  previewLocation: { lat: number; lng: number } | null;
  mapStyle: MapStyleType;
  livePoints: GpsPoint[];
  livePointsVersion: number;
  gpsEnabled: boolean;
  onStart: () => void;
  onSelectSport: (sport: SportTypeWithIcon) => void;
  onOpenAllSports: () => void;
  onManageShortcuts: () => void;
  onClose: () => void;
  // Map tools
  followUser: boolean;
  onRecenter: () => void;
  onCycleMapStyle: () => void;
  audioCoachActive?: boolean;
  onToggleAudioCoach?: () => void;
  // Route layer
  routeLayerActive: boolean;
  onRouteLayerChange: (active: boolean) => void;
  nearbyRoutes?: NearbyRoute[];
  selectedRouteKey: string | null;
  selectedRouteTitle: string | null;
  plannedRoute: GeoJSONLineString | null;
  onRouteSelect: (route: NearbyRoute) => void;
  onOpenRoutePicker: () => void;
  onClearRoute: () => void;
  // Training goal
  workoutLabel?: string | null;
  onOpenWorkout?: (type?: 'distance' | 'time') => void;
  onClearWorkout?: () => void;
  // Dev
  devSimRunning?: boolean;
  onToggleDevSim?: () => void;
}

/**
 * The pre-start screen (design "Racefy v2" → PreStartScreen).
 *
 * Map first, decisions second: the map fills the screen, a tool rail sits on the
 * right edge, and everything the athlete sets before starting — sport, goal,
 * route — lives in one card above the START button, so the whole setup is
 * visible and reachable with one thumb.
 *
 * The map has exactly two states, Map and Route, as one explicit toggle rather
 * than a floating button whose meaning you have to guess.
 */
export function IdleView({
  selectedSport,
  shortcutSports,
  sportsLoading,
  isLoading,
  gpsSignal,
  currentPosition,
  previewLocation,
  mapStyle,
  livePoints,
  livePointsVersion,
  gpsEnabled,
  onStart,
  onSelectSport,
  onOpenAllSports,
  onManageShortcuts,
  onClose,
  followUser,
  onRecenter,
  onCycleMapStyle,
  audioCoachActive,
  onToggleAudioCoach,
  routeLayerActive,
  onRouteLayerChange,
  nearbyRoutes,
  selectedRouteKey,
  selectedRouteTitle,
  plannedRoute,
  onRouteSelect,
  onOpenRoutePicker,
  onClearRoute,
  workoutLabel,
  onOpenWorkout,
  onClearWorkout,
  devSimRunning,
  onToggleDevSim,
}: IdleViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const gpsColor =
    gpsSignal === 'good'
      ? colors.primary
      : gpsSignal === 'weak'
        ? colors.warning
        : gpsSignal === 'lost'
          ? colors.error
          : colors.textMuted;
  const gpsLabel = gpsSignal ? t(`recording.gpsSignal.${gpsSignal}`) : t('recording.waitingForGPS');

  const mapStyleIcon =
    mapStyle === 'satellite'
      ? 'globe-outline'
      : mapStyle === 'streets'
        ? 'car-outline'
        : 'trail-sign-outline';

  const canStart = !isLoading && !!selectedSport;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Map ── */}
      {gpsEnabled ? (
        <MapboxLiveMap
          livePoints={livePoints}
          livePointsVersion={livePointsVersion}
          currentPosition={currentPosition ?? previewLocation}
          gpsSignalQuality={gpsSignal ?? 'disabled'}
          followUser={followUser}
          mapStyle={mapStyle}
          nearbyRoutes={routeLayerActive ? nearbyRoutes : undefined}
          selectedRouteKey={selectedRouteKey}
          onRouteSelect={onRouteSelect}
          shadowTrack={routeLayerActive ? plannedRoute : null}
          plannedRoute={routeLayerActive ? plannedRoute : null}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}

      {/* ── Top bar ── */}
      <LinearGradient
        colors={[colors.background, colors.background + 'D0', colors.background + '00']}
        style={[styles.topGradient, { paddingTop: spacing.sm }]}
        pointerEvents="box-none"
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[
              styles.circleButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
            onPress={onClose}
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {t('recording.title')}
            </Text>
            <View style={styles.gpsRow}>
              <LivePulse color={gpsColor} size={6} paused={gpsSignal !== 'good'} />
              <Text style={[styles.gpsText, { color: gpsColor }]} numberOfLines={1}>
                {gpsLabel}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.circleButton,
              { backgroundColor: colors.cardBackground, borderColor: colors.border },
            ]}
            onPress={onManageShortcuts}
            accessibilityLabel={t('recording.shortcuts.title')}
          >
            <Ionicons name="options-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Layer toggle: Map | Route ── */}
      {gpsEnabled && (
        <View
          style={[
            styles.layerToggle,
            {
              top: insets.top + 62,
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
            },
          ]}
        >
          {(['map', 'route'] as const).map((mode) => {
            const active = (mode === 'route') === routeLayerActive;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.layerOption, active && { backgroundColor: colors.textPrimary }]}
                onPress={() => onRouteLayerChange(mode === 'route')}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={mode === 'map' ? 'layers-outline' : 'git-branch-outline'}
                  size={15}
                  color={active ? colors.cardBackground : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.layerText,
                    { color: active ? colors.cardBackground : colors.textSecondary },
                  ]}
                >
                  {t(mode === 'map' ? 'recording.layerMap' : 'recording.layerRoute')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Right tool rail ── */}
      {gpsEnabled && (
        <View style={[styles.toolRail, { top: insets.top + 62 }]}>
          <ToolButton
            icon="locate"
            active={!followUser}
            onPress={onRecenter}
            label={t('recording.recenter')}
          />
          <ToolButton
            icon={mapStyleIcon}
            onPress={onCycleMapStyle}
            label={t('recording.mapStyle')}
          />
          {onToggleAudioCoach && (
            <ToolButton
              icon={audioCoachActive ? 'musical-notes' : 'musical-notes-outline'}
              active={audioCoachActive}
              onPress={onToggleAudioCoach}
              label={t('recording.audioCoach')}
            />
          )}
          {__DEV__ && onToggleDevSim && (
            <ToolButton
              icon={devSimRunning ? 'stop' : 'walk'}
              active={devSimRunning}
              onPress={onToggleDevSim}
              label="Sim"
            />
          )}
        </View>
      )}

      {/* ── Bottom control card ── */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + spacing.md,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardSectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {t('recording.selectSport').toUpperCase()}
          </Text>
          <TouchableOpacity
            onPress={onManageShortcuts}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t('recording.shortcuts.edit')}
            </Text>
          </TouchableOpacity>
        </View>

        {sportsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sportRail}
          >
            {shortcutSports.map((sport) => {
              const active = selectedSport?.id === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportChip,
                    {
                      backgroundColor: active ? colors.textPrimary : colors.cardBackground,
                      borderColor: active ? colors.textPrimary : colors.border,
                    },
                  ]}
                  onPress={() => onSelectSport(sport)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View
                    style={[
                      styles.sportChipIcon,
                      { backgroundColor: active ? colors.primary : colors.primary + '1A' },
                    ]}
                  >
                    <Ionicons
                      name={sport.icon}
                      size={20}
                      color={active ? '#ffffff' : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.sportChipText,
                      { color: active ? colors.cardBackground : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.sportChip, styles.sportChipGhost, { borderColor: colors.border }]}
              onPress={onOpenAllSports}
              activeOpacity={0.85}
            >
              <View style={[styles.sportChipIcon, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="add" size={20} color={colors.textSecondary} />
              </View>
              <Text
                style={[styles.sportChipText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {t('recording.allSports')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Goal + route */}
        <View style={styles.setupRow}>
          <SetupChip
            icon="flag-outline"
            label={t('recording.workout.title')}
            value={workoutLabel ?? t('recording.workout.setGoal')}
            active={!!workoutLabel}
            tone={colors.primary}
            onPress={() => onOpenWorkout?.()}
            onClear={workoutLabel ? onClearWorkout : undefined}
          />
          <SetupChip
            icon="git-branch-outline"
            label={t('recording.shadowTrack')}
            value={selectedRouteTitle ?? t('recording.selectRoute')}
            active={!!selectedRouteTitle}
            tone={ROUTE_BLUE}
            disabled={!gpsEnabled}
            onPress={() => {
              onRouteLayerChange(true);
              onOpenRoutePicker();
            }}
            onClear={selectedRouteTitle ? onClearRoute : undefined}
          />
        </View>

        {/* START */}
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              opacity: canStart ? 1 : 0.6,
            },
          ]}
          onPress={onStart}
          disabled={!canStart}
          activeOpacity={0.85}
          accessibilityLabel={t('recording.start')}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="play" size={21} color="#ffffff" />
              <Text style={styles.startText} numberOfLines={1}>
                {selectedSport
                  ? t('recording.startSport', { sport: selectedSport.name })
                  : t('recording.start')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.startSummary, { color: colors.textSecondary }]} numberOfLines={1}>
          {[workoutLabel ?? t('recording.workout.typeOpen'), selectedRouteTitle]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function ToolButton({
  icon,
  active,
  onPress,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
  onPress: () => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.toolButton,
        {
          backgroundColor: active ? colors.primary : colors.cardBackground,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={19} color={active ? '#ffffff' : colors.textPrimary} />
    </TouchableOpacity>
  );
}

function SetupChip({
  icon,
  label,
  value,
  active,
  tone,
  disabled,
  onPress,
  onClear,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  active: boolean;
  tone: string;
  disabled?: boolean;
  onPress: () => void;
  onClear?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.setupChip,
        {
          backgroundColor: colors.cardBackground,
          borderColor: active ? tone : colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[
          styles.setupChipIcon,
          { backgroundColor: active ? tone + '1A' : colors.background },
        ]}
      >
        <Ionicons name={icon} size={17} color={active ? tone : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.setupChipLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
        <Text style={[styles.setupChipValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onClear && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          accessibilityLabel={`${label} — ${value}`}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.xl,
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  gpsText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  layerToggle: {
    position: 'absolute',
    left: spacing.md,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 25,
  },
  layerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 11,
  },
  layerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  toolRail: {
    position: 'absolute',
    right: spacing.md,
    gap: spacing.sm,
    zIndex: 25,
  },
  toolButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  linkText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sportRail: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sportChip: {
    width: 78,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.xs + 2,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sportChipGhost: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  sportChipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportChipText: {
    fontSize: msFont(11),
    fontWeight: '600',
    textAlign: 'center',
  },
  setupRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  setupChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  setupChipIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupChipLabel: {
    fontSize: msFont(9),
    fontWeight: '700',
    letterSpacing: 1,
  },
  setupChipValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 1,
  },
  startButton: {
    height: 62,
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  startText: {
    color: '#ffffff',
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  startSummary: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
});
