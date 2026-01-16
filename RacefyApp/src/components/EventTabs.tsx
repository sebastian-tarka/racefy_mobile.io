import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';

export type EventTabType = 'details' | 'commentary' | 'participants' | 'leaderboard';

interface TabConfig {
  label: string;
  value: EventTabType;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface EventTabsProps {
  tabs: TabConfig[];
  activeTab: EventTabType;
  onTabChange: (tab: EventTabType) => void;
}

export function EventTabs({ tabs, activeTab, onTabChange }: EventTabsProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.tabContainer,
        {
          backgroundColor: colors.cardBackground,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tab,
              isActive && { borderBottomColor: colors.primary },
            ]}
            onPress={() => onTabChange(tab.value)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              {tab.badge !== undefined && tab.badge > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.badgeText, { color: colors.white }]}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
});
