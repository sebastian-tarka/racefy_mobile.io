import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks';
import type { MapStyleType } from '../../../hooks/useMapStyleCycler';
import { msFont, spacing } from '../../../theme';

interface Props {
  /** Re-center / back to stats / map style — only over the full-screen map. */
  showMapButtons: boolean;
  /** Distance from the top, clearing the header and the broadcast row. */
  top: number;
  followUser: boolean;
  mapStyle: MapStyleType;
  onRecenter: () => void;
  onShowStats: () => void;
  onCycleMapStyle: () => void;
  /** DEV build only: the simulated-run toggle (audio coach testing). */
  showDevSim: boolean;
  devSimBottom: number;
  devSimRunning: boolean;
  devSimDistanceKm: number;
  onToggleDevSim: () => void;
  onDevSimInfo: () => void;
}

/**
 * The buttons floating over the recording map: re-center, back to the stats
 * view, cycle the map style — plus the dev-only simulated run. Absolutely
 * positioned over the whole screen with `box-none`, so the map underneath
 * keeps every touch that misses a button.
 */
export const MapControlsOverlay = React.memo(function MapControlsOverlay({
  showMapButtons,
  top,
  followUser,
  mapStyle,
  onRecenter,
  onShowStats,
  onCycleMapStyle,
  showDevSim,
  devSimBottom,
  devSimRunning,
  devSimDistanceKm,
  onToggleDevSim,
  onDevSimInfo,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {showMapButtons && (
        <View style={[styles.topRightControls, { top }]}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: followUser ? colors.cardBackground : colors.primary },
            ]}
            onPress={onRecenter}
            activeOpacity={0.7}
            accessibilityLabel={t('recording.recenter')}
          >
            <Ionicons
              name="navigate"
              size={26}
              color={followUser ? colors.textSecondary : '#ffffff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onShowStats}
            activeOpacity={0.7}
            accessibilityLabel={t('recording.viewStats')}
          >
            <Ionicons name="list-outline" size={26} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.cardBackground }]}
            onPress={onCycleMapStyle}
            activeOpacity={0.7}
            accessibilityLabel={t('recording.mapStyle')}
          >
            <Ionicons
              name={
                mapStyle === 'satellite'
                  ? 'globe-outline'
                  : mapStyle === 'streets'
                    ? 'car-outline'
                    : 'trail-sign-outline'
              }
              size={26}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {showDevSim && (
        <View style={[styles.devSim, { bottom: devSimBottom }]}>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: devSimRunning ? '#ef4444' : colors.cardBackground },
            ]}
            onPress={onToggleDevSim}
            onLongPress={onDevSimInfo}
            activeOpacity={0.7}
          >
            <Ionicons
              name={devSimRunning ? 'stop' : 'walk'}
              size={28}
              color={devSimRunning ? '#fff' : colors.textSecondary}
            />
          </TouchableOpacity>
          <Text
            style={[styles.devSimLabel, { color: devSimRunning ? '#ef4444' : colors.textMuted }]}
          >
            {devSimRunning ? `${devSimDistanceKm.toFixed(1)}km` : 'SimRun'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
  },
  topRightControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  devSim: {
    position: 'absolute',
    right: spacing.lg,
  },
  devSimLabel: {
    fontSize: msFont(9),
    textAlign: 'center',
    marginTop: 2,
  },
});
