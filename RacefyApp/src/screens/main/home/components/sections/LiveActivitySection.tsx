import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface LiveActivitySectionProps {
  section: HomeSection;
  onPress?: () => void;
}

/**
 * Live Activity section component.
 * Shows currently active users exercising in the community.
 * Encourages users to join the activity.
 */
export function LiveActivitySection({ section, onPress }: LiveActivitySectionProps) {
  const { colors } = useTheme();

  const activeCount = section.live?.active_users_count;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.error + '15' }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.content}>
        <View style={[styles.pulseContainer, { backgroundColor: colors.error + '30' }]}>
          <View style={[styles.pulseInner, { backgroundColor: colors.error }]}>
            <Ionicons name="pulse" size={20} color="#ffffff" />
          </View>
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.error }]}>
              {section.title}
            </Text>
            {activeCount && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  pulseInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
