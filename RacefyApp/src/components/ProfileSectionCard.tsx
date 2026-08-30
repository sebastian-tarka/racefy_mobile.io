import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, msFont } from '../theme';

interface ProfileSectionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color used for the left border and icon. */
  accentColor: string;
  label: string;
  subtitle: string;
  onPress: () => void;
  /** Shows a spinner instead of the trailing chevron and disables the card. */
  loading?: boolean;
  /** Shows a lock icon instead of the trailing chevron (e.g. premium-gated). */
  locked?: boolean;
  disabled?: boolean;
  /**
   * `row` is the full-width list entry. `tile` is the half-width variant used
   * in the profile grid: same information, stacked, without the chevron — a
   * chevron on a tile points at nothing.
   */
  layout?: 'row' | 'tile';
}

/**
 * A single navigation row in the profile's "sections" group:
 * accent-colored icon tile, label + subtitle, and a trailing affordance
 * (chevron / lock / spinner).
 */
export function ProfileSectionCard({
  icon,
  accentColor,
  label,
  subtitle,
  onPress,
  loading = false,
  locked = false,
  disabled = false,
  layout = 'row',
}: ProfileSectionCardProps) {
  const { colors, isDark } = useTheme();

  const background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';

  if (layout === 'tile') {
    return (
      <TouchableOpacity
        style={[styles.tile, { borderLeftColor: accentColor, backgroundColor: background }]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.75}
      >
        <View style={styles.tileTop}>
          <View style={[styles.icon, styles.tileIcon, { backgroundColor: accentColor + '22' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            locked && <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          )}
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor, backgroundColor: background }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      <View style={[styles.icon, { backgroundColor: accentColor + '22' }]}>
        <Ionicons name={icon} size={20} color={accentColor} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={accentColor} />
      ) : (
        <Ionicons
          name={locked ? 'lock-closed' : 'chevron-forward'}
          size={16}
          color={colors.textMuted}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  tile: {
    // Two per row inside a `flexWrap` grid, both stretching to fill the line.
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileIcon: {
    width: 32,
    height: 32,
    marginRight: 0,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  text: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  sub: {
    fontSize: msFont(11),
    marginTop: 1,
  },
});
