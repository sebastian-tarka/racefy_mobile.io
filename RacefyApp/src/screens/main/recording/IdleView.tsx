import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, fontSize, borderRadius, componentSize } from '../../../theme';
import type { GpsPoint } from '../../../types/api';
import type { SportTypeWithIcon } from '../../../hooks/useSportTypes';
import type { TrackingStatus } from '../../../hooks/useLiveActivity';
import { MapboxLiveMap } from '../../../components';
import type { MapStyleType } from '../../../components/MapboxLiveMap';

interface IdleViewProps {
  selectedSport: SportTypeWithIcon | null;
  sportTypes: SportTypeWithIcon[];
  sportsLoading: boolean;
  isLoading: boolean;
  audioCoachActive?: boolean;
  onToggleAudioCoach?: () => void;
  gpsSignal: TrackingStatus['gpsSignal'] | null;
  currentPosition: { lat: number; lng: number } | null;
  previewLocation: { lat: number; lng: number } | null;
  mapStyle: MapStyleType;
  livePoints: GpsPoint[];
  livePointsVersion: number;
  gpsEnabled: boolean;
  onStart: () => void;
  onSelectSport: (sport: SportTypeWithIcon) => void;
  // Toolbar extras
  viewMode?: 'stats' | 'map';
  onToggleView?: () => void;
  devSimRunning?: boolean;
  onToggleDevSim?: () => void;
  devSimDistanceKm?: number;
}

export function IdleView({
  selectedSport,
  sportTypes,
  sportsLoading,
  isLoading,
  audioCoachActive,
  onToggleAudioCoach,
  gpsSignal,
  currentPosition,
  previewLocation,
  mapStyle,
  livePoints,
  livePointsVersion,
  gpsEnabled,
  onStart,
  onSelectSport,
  viewMode,
  onToggleView,
  devSimRunning,
  onToggleDevSim,
  devSimDistanceKm,
}: IdleViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [cardHeight, setCardHeight] = useState(0);

  return (
    <View style={styles.container}>
      {/* Map background */}
      {gpsEnabled ? (
        <MapboxLiveMap
          livePoints={livePoints}
          livePointsVersion={livePointsVersion}
          currentPosition={currentPosition ?? previewLocation}
          gpsSignalQuality={gpsSignal ?? 'disabled'}
          followUser
          mapStyle={mapStyle}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}

      {/* Top gradient vignette */}
      {gpsEnabled && (
        <LinearGradient
          colors={['rgba(0,0,0,0.60)', 'transparent']}
          style={styles.topGradient}
          pointerEvents="none"
        />
      )}

      {/* Bottom gradient vignette */}
      {gpsEnabled && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
      )}

      {/* Top overlay: sport grid + icon toolbar (vertical scroll) */}
      <ScrollView
        style={styles.topOverlay}
        contentContainerStyle={styles.topOverlayContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sport grid – centered wrapping tiles */}
        {sportsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : (
          <View style={styles.sportGrid}>
            {sportTypes.map(sport => {
              const isSelected = selectedSport?.id === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportCard,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: isSelected ? colors.primary : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                    },
                  ]}
                  onPress={() => onSelectSport(sport)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.sportCardIcon,
                      { backgroundColor: isSelected ? colors.primary + '18' : colors.background },
                    ]}
                  >
                    <Ionicons
                      name={sport.icon}
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[styles.sportCardName, { color: isSelected ? colors.primary : colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Icon toolbar – centered below sport grid */}
        {(onToggleAudioCoach !== undefined || onToggleView !== undefined || (__DEV__ && onToggleDevSim !== undefined)) && (
          <View style={styles.iconToolbar}>
            {onToggleAudioCoach !== undefined && (
              <TouchableOpacity
                style={[
                  styles.toolbarIcon,
                  { backgroundColor: audioCoachActive ? colors.primary : colors.cardBackground },
                ]}
                onPress={onToggleAudioCoach}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.audioCoach')}
              >
                <Ionicons
                  name={audioCoachActive ? 'musical-notes' : 'musical-notes-outline'}
                  size={24}
                  color={audioCoachActive ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>
            )}

            {onToggleView !== undefined && (
              <TouchableOpacity
                style={[styles.toolbarIcon, { backgroundColor: colors.primary }]}
                onPress={onToggleView}
                activeOpacity={0.7}
                accessibilityLabel={t('recording.toggleView')}
              >
                <Ionicons
                  name={viewMode === 'stats' ? 'map-outline' : 'list-outline'}
                  size={24}
                  color="#ffffff"
                />
              </TouchableOpacity>
            )}

            {__DEV__ && onToggleDevSim !== undefined && (
              <TouchableOpacity
                style={[
                  styles.toolbarIcon,
                  { backgroundColor: devSimRunning ? '#ef4444' : colors.cardBackground },
                ]}
                onPress={onToggleDevSim}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={devSimRunning ? 'stop' : 'walk'}
                  size={24}
                  color={devSimRunning ? '#ffffff' : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* START button – floating above the bottom card */}
      {cardHeight > 0 && (
        <View
          style={[styles.startButtonWrapper, { bottom: cardHeight + spacing.md }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[
              styles.startButton,
              {
                backgroundColor: colors.primary,
                opacity: isLoading || !selectedSport ? 0.6 : 1,
              },
            ]}
            onPress={onStart}
            disabled={isLoading || !selectedSport}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.startButtonText}>{t('recording.start').toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom area – transparent, only used for layout measurement */}
      <View
        style={[styles.bottomCard, { paddingBottom: insets.bottom + spacing.lg }]}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
      >
        <Text style={styles.lockHint}>
          {t('recording.holdToLock', 'HOLD BUTTON TO LOCK ACTIVITY SCREEN')}
        </Text>
      </View>
    </View>
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
    height: 220,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    zIndex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    zIndex: 20,
    maxHeight: '55%',
  },
  topOverlayContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sportCard: {
    width: 76,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  sportCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportCardName: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  iconToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  toolbarIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  startButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xl,
    width: Math.min(SCREEN_WIDTH * 0.70, componentSize.startButton * 2.4),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: fontSize.xxl,
    fontWeight: '700',
    letterSpacing: 2,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.sm,
    zIndex: 20,
  },
  lockHint: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
    marginTop: spacing.md,
    color: 'rgba(255,255,255,0.65)',
  },
});