import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../theme';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsBarProps {
  onStartActivity: () => void;
  onCreatePost: () => void;
  onFindEvents: () => void;
}

export function QuickActionsBar({ onStartActivity, onCreatePost, onFindEvents }: QuickActionsBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const actions: QuickAction[] = [
    {
      icon: 'add-circle',
      labelKey: 'home.quickActions.createPost',
      color: '#3b82f6',
      onPress: onCreatePost,
    },
    {
      icon: 'play-circle',
      labelKey: 'home.quickActions.startActivity',
      color: '#10b981',
      onPress: onStartActivity,
    },
    {
      icon: 'calendar',
      labelKey: 'events.createEvent',
      color: '#f59e0b',
      onPress: onFindEvents,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
            <Ionicons name={action.icon} size={24} color={action.color} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.textPrimary }]} numberOfLines={1}>
            {t(action.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
});
