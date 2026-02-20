import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScreenHeader, LeaderboardList, EmptyState, TimeRangeFilter, type PeriodOption, ScreenContainer } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useLeaderboard, LeaderboardType } from '../../hooks/useLeaderboard';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { LeaderboardPeriod } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

type TabType = 'global' | 'following';

const PERIOD_OPTIONS: PeriodOption<LeaderboardPeriod>[] = [
  { value: 'all_time', labelKey: 'leaderboard.periods.allTime' },
  { value: 'monthly', labelKey: 'leaderboard.periods.monthly' },
  { value: 'weekly', labelKey: 'leaderboard.periods.weekly' },
];

export function LeaderboardScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global leaderboard
  const globalLeaderboard = useLeaderboard({
    type: 'global',
    period: 'all_time',
    autoLoad: true,
  });

  // Following leaderboard (only load when authenticated and tab is active)
  const followingLeaderboard = useLeaderboard({
    type: 'following',
    period: globalLeaderboard.period,
    autoLoad: isAuthenticated && activeTab === 'following',
  });

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : followingLeaderboard;

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'following' && isAuthenticated) {
      followingLeaderboard.changePeriod(globalLeaderboard.period);
      followingLeaderboard.refetch();
    }
  }, [isAuthenticated, globalLeaderboard.period]);

  const handlePeriodChange = useCallback((period: LeaderboardPeriod) => {
    globalLeaderboard.changePeriod(period);
    if (activeTab === 'following' && isAuthenticated) {
      followingLeaderboard.changePeriod(period);
    }
  }, [activeTab, isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await currentLeaderboard.refetch();
    setIsRefreshing(false);
  }, [currentLeaderboard]);

  const handleUserPress = useCallback((username: string) => {
    navigation.navigate('UserProfile', { username });
  }, [navigation]);

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('leaderboard.tabs.global'), value: 'global', icon: 'globe-outline' },
    { label: t('leaderboard.tabs.following'), value: 'following', icon: 'people-outline' },
  ];

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.tab,
              activeTab === tab.value && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleTabChange(tab.value)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.value ? colors.white : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.value ? colors.white : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period Selector */}
      <TimeRangeFilter
        options={PERIOD_OPTIONS}
        selectedValue={currentLeaderboard.period}
        onSelectValue={handlePeriodChange}
        isLoading={currentLeaderboard.isLoading}
      />
    </View>
  );

  // Show auth required message for following tab
  if (activeTab === 'following' && !isAuthenticated) {
    return (
      <ScreenContainer>
        <ScreenHeader
          title={t('leaderboard.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {renderHeader()}
          <EmptyState
            icon="lock-closed-outline"
            title={t('leaderboard.authRequired')}
            message={t('leaderboard.authRequiredMessage')}
            actionLabel={t('common.signIn')}
            onAction={() => navigation.navigate('Auth', { screen: 'Login' })}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('leaderboard.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <LeaderboardList
        entries={currentLeaderboard.entries}
        isLoading={currentLeaderboard.isLoading}
        error={currentLeaderboard.error}
        onUserPress={handleUserPress}
        onRetry={currentLeaderboard.refetch}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {/* Refresh control wrapper */}
          </View>
        }
        emptyMessage={
          activeTab === 'following'
            ? t('leaderboard.noFollowingEntries')
            : t('leaderboard.noEntries')
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});