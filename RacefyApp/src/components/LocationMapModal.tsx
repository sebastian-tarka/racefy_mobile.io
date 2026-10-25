import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../theme';
import { reverseGeocode } from '../services/geocoding';
import { getAppLocale } from '../utils/dateFormat';
import { Button } from './Button';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  /** null when reverse geocoding found nothing — keep whatever name the form had. */
  name: string | null;
}

interface LocationMapModalProps {
  visible: boolean;
  /** Mapbox module, already initialised by the caller (it is loaded conditionally). */
  MapboxGL: any;
  initialCenter: [number, number];
  initialZoom: number;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
}

const NAME_LOOKUP_DELAY_MS = 400;

/**
 * Full-screen map for placing the event: the pin stays in the middle and the
 * map moves under it, so panning and pinch-zoom are free — inside the form's
 * ScrollView the map fought the scroll for every gesture.
 */
export function LocationMapModal({
  visible,
  MapboxGL,
  initialCenter,
  initialZoom,
  onClose,
  onConfirm,
}: LocationMapModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lookupId = useRef(0);

  useEffect(() => {
    if (!visible) {
      setCenter(null);
      setName(null);
    }
  }, [visible]);

  // Name the spot once the map stops moving; a newer move cancels an older lookup.
  useEffect(() => {
    if (!center) return;
    const id = ++lookupId.current;
    setIsLookingUp(true);
    const timer = setTimeout(async () => {
      const found = await reverseGeocode(center[1], center[0]);
      if (id !== lookupId.current) return;
      setName(found);
      setIsLookingUp(false);
    }, NAME_LOOKUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [center]);

  const handleConfirm = () => {
    const [lng, lat] = center ?? initialCenter;
    onConfirm({ latitude: lat, longitude: lng, name });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {visible && (
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={
              isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/outdoors-v12'
            }
            localizeLabels={{ locale: getAppLocale() }}
            onMapIdle={(state: { properties: { center: [number, number] } }) =>
              setCenter(state.properties.center as [number, number])
            }
            attributionEnabled={false}
            logoEnabled={false}
            scaleBarEnabled={false}
            pitchEnabled={false}
          >
            <MapboxGL.Camera
              defaultSettings={{ centerCoordinate: initialCenter, zoomLevel: initialZoom }}
            />
          </MapboxGL.MapView>
        )}

        {/* Fixed pin: its tip marks the map centre */}
        <View pointerEvents="none" style={styles.pinWrapper}>
          <Ionicons name="location" size={44} color={colors.primary} style={styles.pin} />
        </View>

        <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </SafeAreaView>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.bottomCard, { backgroundColor: colors.cardBackground }]}
        >
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('eventForm.locationMapHint')}
          </Text>
          <View style={styles.nameRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            {isLookingUp ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
                {name ?? t('eventForm.locationUnnamed')}
              </Text>
            )}
          </View>
          <Button
            title={t('eventForm.locationUseThis')}
            onPress={handleConfirm}
            disabled={!center}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const PIN_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    // Lift the icon so its tip, not its middle, sits on the centre point
    marginBottom: PIN_SIZE,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  hint: {
    fontSize: fontSize.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 24,
  },
  name: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
