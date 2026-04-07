/**
 * ViewToggleButton - Floating action button to switch between stats and map views
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/spacing';

interface ViewToggleButtonProps {
  currentView: 'stats' | 'map';
  onToggle: () => void;
  disabled?: boolean;
}

export function ViewToggleButton({
  currentView,
  onToggle,
  disabled = false,
}: ViewToggleButtonProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Account for bottom tab bar height (60px + safe area bottom inset)
  const tabBarHeight = 60 + insets.bottom;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  };

  const iconName = currentView === 'stats' ? 'map-outline' : 'list-outline';

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.primary, bottom: tabBarHeight + spacing.md }]}
      onPress={handleToggle}
      disabled={disabled}
      accessibilityLabel={t('recording.toggleView')}
      accessibilityHint={currentView === 'stats' ? t('recording.viewMap') : t('recording.viewStats')}
    >
      <Ionicons name={iconName} size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
});
