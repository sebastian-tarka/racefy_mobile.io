import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize } from '../theme';

export type TabType = 'posts' | 'activities' | 'events';

interface TabConfig {
  label: string;
  value: TabType;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ProfileTabsProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ProfileTabs({ tabs, activeTab, onTabChange }: ProfileTabsProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={[styles.tab, activeTab === tab.value && { borderBottomColor: colors.primary }]}
          onPress={() => onTabChange(tab.value)}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={activeTab === tab.value ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.tabText, { color: activeTab === tab.value ? colors.primary : colors.textSecondary }]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
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
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
});