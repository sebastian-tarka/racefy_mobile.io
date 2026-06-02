import React from 'react';
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTheme} from '../hooks/useTheme';
import {borderRadius, fontSize, spacing} from '../theme';

export interface OptionListItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent color for the icon and its tile background. Defaults to the primary color. */
  iconColor?: string;
  title: string;
  /** Override the title color (e.g. for destructive actions). */
  titleColor?: string;
  subtitle?: string;
  onPress?: () => void;
  /** Custom trailing node. Pass `null` to render nothing; omit for the default chevron. */
  trailing?: React.ReactNode;
  /** Render no trailing affordance (e.g. for non-navigational actions). */
  hideChevron?: boolean;
  /** Show a spinner in place of the trailing affordance and disable the row. */
  loading?: boolean;
  disabled?: boolean;
}

interface OptionListProps {
  options: OptionListItem[];
  /** Render all rows inside a single bordered card separated by dividers (instead of separate cards). */
  grouped?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A vertically stacked group of tappable option rows (icon tile, title, subtitle and a
 * trailing chevron / spinner / custom node). Reusable for settings-style menus and the
 * grouped actions under the training plan. Use `grouped` to merge rows into one card.
 */
export function OptionList({ options, grouped = false, style }: OptionListProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        grouped
          ? [styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]
          : styles.group,
        style,
      ]}
    >
      {options.map((opt, index) => {
        const accent = opt.iconColor ?? colors.primary;
        return (
          <TouchableOpacity
            key={opt.id}
            style={
              grouped
                ? [
                    styles.groupedRow,
                    index < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
                  ]
                : [styles.row, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]
            }
            onPress={opt.onPress}
            disabled={opt.disabled || opt.loading || !opt.onPress}
            activeOpacity={0.8}
          >
            <View style={[styles.iconTile, { backgroundColor: accent + '18' }]}>
              <Ionicons name={opt.icon} size={20} color={accent} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, { color: opt.titleColor ?? colors.textPrimary }]} numberOfLines={1}>
                {opt.title}
              </Text>
              {!!opt.subtitle && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {opt.subtitle}
                </Text>
              )}
            </View>
            {opt.loading ? (
              <ActivityIndicator size="small" color={accent} />
            ) : opt.trailing !== undefined ? (
              opt.trailing
            ) : opt.hideChevron ? null : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
});