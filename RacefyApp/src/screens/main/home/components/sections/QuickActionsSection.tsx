import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../../theme';
import { QuickActionsBar } from '../QuickActionsBar';
import type { HomeSection } from '../../../../../types/api';

interface QuickActionsSectionProps {
  section: HomeSection;
  isAuthenticated: boolean;
  onStartActivity: () => void;
  onCreatePost: () => void;
  onFindEvents: () => void;
}

/**
 * Quick Actions section component.
 * Renders quick action buttons for authenticated users.
 *
 * Backend decides when to show this section.
 */
export function QuickActionsSection({
  section,
  isAuthenticated,
  onStartActivity,
  onCreatePost,
  onFindEvents,
}: QuickActionsSectionProps) {
  const { colors } = useTheme();

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      {section.title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
        </View>
      )}
      <QuickActionsBar
        onStartActivity={onStartActivity}
        onCreatePost={onCreatePost}
        onFindEvents={onFindEvents}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
