import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { fontSize } from '../theme';

export type Visibility = 'public' | 'followers' | 'private';

/**
 * Who can see a post or an activity — the same mark as the web app's VisibilityBadge:
 * public = globe (green), followers = people (blue), private ("only me") = lock (amber).
 * Shown to the author only. `variant="icon"` drops the label (it stays in the accessibility label).
 */
export function VisibilityBadge({
  visibility,
  variant = 'pill',
}: {
  visibility?: string | null;
  variant?: 'pill' | 'icon';
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const style = {
    public: { icon: 'globe-outline', color: colors.primary, bg: colors.primary + '1f' },
    followers: { icon: 'people-outline', color: colors.info, bg: colors.info + '1f' },
    private: {
      icon: 'lock-closed-outline',
      color: colors.warningStrong,
      bg: colors.warning + '24',
    },
  }[visibility as Visibility];

  if (!style) return null;

  const label = t(`visibility.${visibility}`);

  return (
    <View
      style={[
        styles.badge,
        variant === 'icon' ? styles.iconOnly : styles.pill,
        { backgroundColor: style.bg },
      ]}
      accessible
      accessibilityLabel={label}
    >
      <Ionicons name={style.icon as keyof typeof Ionicons.glyphMap} size={12} color={style.color} />
      {variant === 'pill' && <Text style={[styles.label, { color: style.color }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999 },
  pill: { gap: 3, paddingHorizontal: 6, paddingVertical: 2 },
  iconOnly: { padding: 4 },
  label: { fontSize: fontSize.xs, fontWeight: '600' },
});
