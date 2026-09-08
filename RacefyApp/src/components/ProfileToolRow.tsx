import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, msFont, spacing } from '../theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** What this row is right now — a count, a name, a percentage. */
  status: string;
  tone: string;
  onPress: () => void;
  /** First row in a group draws no separator above itself. */
  first?: boolean;
  /** Behind a paywall: the icon greys out and the row carries a tier pill. */
  locked?: boolean;
  badge?: string;
}

/**
 * One row of the profile's tool list (design "Racefy v2" → ToolRow).
 *
 * The status line is the point. Seven tiles that only said what they linked to
 * gave nobody a reason to open any of them; "Nobody is streaming right now" or
 * "2 active · 68%" answers the question on the spot, and the row becomes the
 * way in only when there is something to see.
 */
export function ProfileToolRow({
  icon,
  title,
  status,
  tone,
  onPress,
  first,
  locked,
  badge,
}: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${status}`}
    >
      <View style={[styles.icon, { backgroundColor: locked ? colors.background : tone + '1F' }]}>
        <Ionicons name={icon} size={18} color={locked ? colors.textMuted : tone} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={1}>
          {status}
        </Text>
      </View>

      {!!badge && (
        <View style={[styles.badge, { backgroundColor: colors.ai }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  status: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: msFont(10),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
