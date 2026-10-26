import React from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { msFont, spacing } from '../../../theme';

export type ProfileTabType = 'posts' | 'drafts' | 'stats' | 'activities' | 'events';

interface Props {
  activeTab: ProfileTabType;
  onChange: (tab: ProfileTabType) => void;
  /** Own activities new since the last visit. */
  newActivities: number;
  draftsCount: number;
}

/**
 * Sticky section header: once you have scrolled past the profile, the tabs
 * stay within reach instead of forcing a trip back to the top.
 */
export const ProfileTabBar = React.memo(function ProfileTabBar({
  activeTab,
  onChange,
  newActivities,
  draftsCount,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const tabs: { label: string; value: ProfileTabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.stats'), value: 'stats', icon: 'stats-chart-outline' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'heart-outline' },
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'reorder-three-outline' },
    { label: t('profile.tabs.drafts'), value: 'drafts', icon: 'create-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  return (
    <View style={[styles.stickyTabs, { backgroundColor: colors.background }]}>
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        {/* Packed to the left and scrollable rather than five equal columns:
            the labels are different lengths, and stretching them apart makes
            the marker under the active one harder to attach to a word. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tab, active && { borderBottomColor: colors.primary }]}
                onPress={() => onChange(tab.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={active ? colors.primaryDark : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active ? colors.primaryDark : colors.textSecondary,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tab.value === 'activities' && newActivities > 0 && (
                  <View style={[styles.draftsBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.draftsBadgeText, { color: colors.white }]}>
                      {newActivities > 99 ? '99+' : newActivities}
                    </Text>
                  </View>
                )}
                {tab.value === 'drafts' && draftsCount > 0 && (
                  <View style={[styles.draftsBadge, { backgroundColor: colors.error }]}>
                    <Text style={[styles.draftsBadgeText, { color: colors.white }]}>
                      {draftsCount > 99 ? '99+' : draftsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  draftsBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 17,
    minHeight: 17,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  draftsBadgeText: {
    fontSize: msFont(9),
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stickyTabs: {
    // The bar is pinned by SectionList, so the gap below it has to be opaque
    // padding on the pinned element — with a margin the rows show through it.
    paddingBottom: spacing.md,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 1,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContainer: {
    borderBottomWidth: 1,
    // Kreska idzie przez całą szerokość — znosi wcięcie listy.
    marginHorizontal: -spacing.lg,
  },
  tabScroll: {
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  tabText: {
    fontSize: msFont(11),
    textAlign: 'center',
  },
});
