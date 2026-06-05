/**
 * MapStylePicker — thumbnail-grid picker for the per-user route map style.
 *
 * Renders "System default" plus every style returned by /config/map-style
 * (via useMapStyle). Selecting a tile optimistically updates the preference and
 * PUTs /profile/preferences; "System default" sends an explicit null reset.
 *
 * Existing route images keep the style they were generated with (server-side) —
 * the hint below the grid explains this. Designed to live inside the General
 * Preferences SettingsSection.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useMapStyle } from '../hooks/useMapStyle';
import { fixStorageUrl } from '../config/api';
import { borderRadius, fontSize, fontWeight, spacing } from '../theme';

/** Slug used in the static preview asset path: "mapbox/dark-v11" -> "mapbox-dark-v11". */
function styleSlug(styleId: string): string {
  return styleId.replace(/\//g, '-');
}

function previewUrl(styleId: string): string | null {
  return fixStorageUrl(`/images/map-style-previews/${styleSlug(styleId)}.jpg`);
}

interface StyleTileProps {
  /** The style id whose preview thumbnail to show (admin default for System tile). */
  previewStyleId: string | null;
  selected: boolean;
  disabled: boolean;
  label: string;
  /** Secondary muted line (System default tile only). */
  subLabel?: string;
  onPress: () => void;
}

function StyleTile({
  previewStyleId,
  selected,
  disabled,
  label,
  subLabel,
  onPress,
}: StyleTileProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = previewStyleId ? previewUrl(previewStyleId) : null;

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: colors.cardBackground,
          borderColor: selected ? colors.primary : colors.border,
        },
        selected && styles.tileSelected,
        selected && { borderColor: colors.primary },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.thumb, { backgroundColor: colors.background }]}>
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="map-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        {selected && (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          </View>
        )}
      </View>
      <View style={styles.tileLabelWrap}>
        <Text style={[styles.tileLabel, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        {!!subLabel && (
          <Text style={[styles.tileSubLabel, { color: colors.textMuted }]} numberOfLines={1}>
            {subLabel}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function MapStylePicker() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { availableStyles, staticStyle, preference, setPreference } = useMapStyle();
  const [saving, setSaving] = useState(false);

  const styleLabel = (styleId: string) =>
    t(`settings.mapStyle.styles.${styleId}`, { defaultValue: styleId });

  // System default tile first, then every available style.
  const tiles = useMemo(() => [null as string | null, ...availableStyles], [availableStyles]);

  const handleSelect = async (styleId: string | null) => {
    if (saving || styleId === preference) return;
    setSaving(true);
    try {
      await setPreference(styleId);
      Alert.alert(t('common.success'), t('settings.mapStyle.updated'));
    } catch {
      Alert.alert(t('common.error'), t('settings.mapStyle.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons
          name="map-outline"
          size={20}
          color={colors.textPrimary}
          style={styles.headerIcon}
        />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('settings.mapStyle.title')}
        </Text>
        {saving && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.savingSpinner} />
        )}
      </View>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        {t('settings.mapStyle.description')}
      </Text>

      <View style={styles.grid}>
        {tiles.map((styleId) => {
          const isSystem = styleId === null;
          return (
            <StyleTile
              key={styleId ?? '__system__'}
              previewStyleId={isSystem ? staticStyle : styleId}
              selected={preference === styleId}
              disabled={saving}
              label={isSystem ? t('settings.mapStyle.systemDefault') : styleLabel(styleId!)}
              subLabel={isSystem && staticStyle ? styleLabel(staticStyle) : undefined}
              onPress={() => handleSelect(styleId)}
            />
          );
        })}
      </View>

      <Text style={[styles.hint, { color: colors.textMuted }]}>{t('settings.mapStyle.hint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  savingSpinner: {
    marginLeft: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tileSelected: {
    borderWidth: 2,
  },
  thumb: {
    width: '100%',
    aspectRatio: 3 / 2,
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabelWrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tileLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  tileSubLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: fontSize.xs * 1.4,
  },
});
