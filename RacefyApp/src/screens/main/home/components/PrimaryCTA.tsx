import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../theme';
import type { HomePrimaryCta, HomeCtaAction } from '../../../../types/api';

interface PrimaryCtaProps {
  cta: HomePrimaryCta;
  onPress: (action: HomeCtaAction) => void;
}

/**
 * Get icon for CTA action.
 * Icons are hardcoded client-side as they don't change based on backend logic.
 */
function getIconForAction(action: HomeCtaAction): keyof typeof Ionicons.glyphMap {
  switch (action) {
    case 'start_activity':
      return 'play-circle';
    case 'view_events':
      return 'calendar';
    case 'view_feed':
      return 'newspaper';
    case 'register':
      return 'person-add';
    default:
      return 'arrow-forward-circle';
  }
}

/**
 * Primary CTA component for the Home screen.
 * Renders a prominent call-to-action button based on backend configuration.
 *
 * The component does NOT contain any business logic for determining
 * what action to show - it simply renders what the backend provides.
 */
export function PrimaryCTA({ cta, onPress }: PrimaryCtaProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    onPress(cta.action);
  }, [cta.action, onPress]);

  const icon = getIconForAction(cta.action);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.label} numberOfLines={1}>
            {cta.label}
          </Text>
          {cta.subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {cta.subtitle}
            </Text>
          )}
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={32} color="#ffffff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
