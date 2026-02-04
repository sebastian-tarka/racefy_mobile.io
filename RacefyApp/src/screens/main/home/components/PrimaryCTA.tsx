import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius, fontWeight } from '../../../../theme';
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
      style={[styles.container, { shadowColor: colors.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Ionicons name={icon} size={22} color="#ffffff" style={styles.leadingIcon} />
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
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
  },
  gradient: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  leadingIcon: {
    marginRight: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
});
