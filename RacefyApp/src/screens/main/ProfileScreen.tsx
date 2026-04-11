import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ImageBackground,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {useTranslation} from 'react-i18next';
import type {CompositeNavigationProp} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import {
    ActivityCard,
    Avatar,
    CompareUserSelector,
    DraftsTab,
    EmptyState,
    EventCard,
    type PeriodOption,
    PointsCard,
    PostCard,
    PremiumTeaser,
    ScreenContainer,
    SportStatsChart,
    SportTypeFilter,
    type TimeRange,
    TimeRangeFilter,
    UserListModal,
} from '../../components';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAuth} from '../../hooks/useAuth';
import {useSubscription} from '../../hooks/useSubscription';
import {useTheme} from '../../hooks/useTheme';
import {useActivityStats} from '../../hooks/useActivityStats';
import {usePointStats} from '../../hooks/usePointStats';
import {useSportTypes} from '../../hooks/useSportTypes';
import {useFollowing} from '../../hooks/useFollowing';
import {usePaginatedTabData} from '../../hooks/usePaginatedTabData';
import {api} from '../../services/api';
import {logger} from '../../services/logger';
import {useRefreshOn} from '../../services/refreshEvents';
import {fixStorageUrl} from '../../config/api';
import {borderRadius, fontSize, spacing} from '../../theme';
import {getDateRangeForTimeRange} from '../../utils/dateRanges';
import type {BottomTabNavigationProp, BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';
import type {Activity, ActivityStats, Event, Post, User, UserStats} from '../../types/api';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

type TabType = 'posts' | 'drafts' | 'stats' | 'activities' | 'events';

const INITIAL_PAGE = 1;
const SETTINGS_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const TIME_RANGE_OPTIONS: PeriodOption<TimeRange>[] = [
  { value: 'all_time', labelKey: 'profile.stats.timeRange.allTime' },
  { value: 'year', labelKey: 'profile.stats.timeRange.year' },
  { value: 'month', labelKey: 'profile.stats.timeRange.month' },
  { value: 'week', labelKey: 'profile.stats.timeRange.week' },
];

export function ProfileScreen({ navigation, route }: Props & { navigation: ProfileScreenNavigationProp }) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { canUse, tier } = useSubscription();
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = 60 + insets.bottom + spacing.md;
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'posts');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [draftsCount, setDraftsCount] = useState(0);

  // Modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | 'requests'>('followers');
  const [pendingFollowCount, setPendingFollowCount] = useState(0);

  // Filter state - MUST be declared before dateRange and hooks that use them
  const [selectedSportTypeId, setSelectedSportTypeId] = useState<number | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all_time');

  // Comparison state
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [compareStats, setCompareStats] = useState<ActivityStats | null>(null);
  const [isLoadingCompareStats, setIsLoadingCompareStats] = useState(false);

  // Update active tab when navigating with initialTab param
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Calculate date range based on selected time range (memoized to prevent unnecessary re-renders)
  const dateRange = useMemo(() => {
    const result = getDateRangeForTimeRange(selectedTimeRange);
    logger.debug('profile', 'Date range calculated', {
      selectedTimeRange,
      result,
    });
    return result;
  }, [selectedTimeRange]);

  // Activity stats and points hooks
  const { stats: activityStats, isLoading: isLoadingActivityStats, refetch: refetchActivityStats } = useActivityStats({
    sportTypeId: selectedSportTypeId,
    from: dateRange?.from ?? undefined,
    to: dateRange?.to ?? undefined,
  });
  const { stats: pointStats, isLoading: isLoadingPointStats, refetch: refetchPointStats } = usePointStats();
  const { sportTypes } = useSportTypes();
  const { following, isLoading: isLoadingFollowing } = useFollowing();

  // Debug: Log filter changes
  useEffect(() => {
    logger.info('profile', 'Filters changed', {
      selectedSportTypeId,
      selectedTimeRange,
      dateRangeFrom: dateRange?.from,
      dateRangeTo: dateRange?.to,
    });
  }, [selectedSportTypeId, selectedTimeRange, dateRange]);

  // Fetch comparison user stats when selected or filters change
  useEffect(() => {
    const fetchCompareStats = async () => {
      if (!compareUser) {
        setCompareStats(null);
        return;
      }

      setIsLoadingCompareStats(true);
      try {
        const stats = await api.getUserActiveActivityStats(compareUser.id, {
          from: dateRange?.from ?? undefined,
          to: dateRange?.to ?? undefined,
          sport_type_id: selectedSportTypeId || undefined,
        });
        setCompareStats(stats);
      } catch (error) {
        logger.error('api', 'Failed to fetch compare user stats', { error, userId: compareUser.id });
        setCompareStats(null);
      } finally {
        setIsLoadingCompareStats(false);
      }
    };

    fetchCompareStats();
  }, [compareUser, selectedSportTypeId, dateRange]);

  // Wrapper functions for usePaginatedTabData
  const fetchPostsWrapper = useCallback((userId: number, page: number) => {
    return api.getPosts({ user_id: userId, page });
  }, []);

  const fetchActivitiesWrapper = useCallback((userId: number, page: number) => {
    return api.getActivities({
      user_id: userId,
      page,
      ...(selectedSportTypeId && { sport_type_id: selectedSportTypeId }),
    });
  }, [selectedSportTypeId]);

  const fetchEventsWrapper = useCallback((userId: number, page: number) => {
    return api.getEvents({ user_id: userId, page });
  }, []);

  // Use pagination hooks for posts, activities, and events
  const postsData = usePaginatedTabData<Post>({
    fetchFunction: fetchPostsWrapper,
    userId: user?.id ?? null,
  });

  const activitiesData = usePaginatedTabData<Activity>({
    fetchFunction: fetchActivitiesWrapper,
    userId: user?.id ?? null,
  });

  const eventsData = usePaginatedTabData<Event>({
    fetchFunction: fetchEventsWrapper,
    userId: user?.id ?? null,
  });

  // Reset paginated data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      setDraftsCount(0);
      postsData.reset();
      activitiesData.reset();
      eventsData.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      logger.error('api', 'Failed to fetch user stats', { error });
    }
  }, [isAuthenticated]);

  const fetchPendingFollowCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getFollowRequests(1);
      setPendingFollowCount(data.meta?.total ?? data.data?.length ?? 0);
    } catch {
      // Silent — not critical
    }
  }, [isAuthenticated]);

  const fetchDraftsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.getDrafts({ page: 1, per_page: 1 });
      setDraftsCount(response.meta.total);
    } catch (error) {
      logger.error('api', 'Failed to fetch drafts count', { error });
    }
  }, [isAuthenticated]);

  // Fetch stats once on mount / auth change (not on every tab focus to avoid header flicker)
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchPendingFollowCount();
    }
  }, [isAuthenticated, fetchStats, fetchPendingFollowCount]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchDraftsCount();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])
  );

  // Load data when tab changes - ALWAYS refresh when switching tabs
  useEffect(() => {
    if (!isAuthenticated) return;

    logger.debug('profile', 'Tab changed, loading fresh data', { activeTab });

    if (activeTab === 'posts') {
      if (!postsData.isLoading) {
        logger.info('profile', 'Refreshing posts data');
        postsData.refresh();
      }
    } else if (activeTab === 'activities') {
      if (!activitiesData.isLoading) {
        logger.info('profile', 'Refreshing activities data');
        activitiesData.refresh();
      }
    } else if (activeTab === 'events') {
      if (!eventsData.isLoading) {
        logger.info('profile', 'Refreshing events data');
        eventsData.refresh();
      }
    } else if (activeTab === 'stats') {
      // Refresh activity stats and point stats
      if (!isLoadingActivityStats) {
        logger.info('profile', 'Refreshing stats data');
        refetchActivityStats();
        refetchPointStats();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  // Refresh activities when sport type filter changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 'activities') {
      activitiesData.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSportTypeId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();

    if (activeTab === 'posts') {
      await postsData.refresh();
    } else if (activeTab === 'stats') {
      await Promise.all([
        refetchActivityStats(),
        refetchPointStats(),
      ]);
    } else if (activeTab === 'activities') {
      await activitiesData.refresh();
    } else if (activeTab === 'events') {
      await eventsData.refresh();
    }

    setIsRefreshing(false);
  };

  // Auto-refresh on mutations from other screens
  useRefreshOn('feed', postsData.refresh);
  useRefreshOn('activities', activitiesData.refresh);
  useRefreshOn('events', eventsData.refresh);
  useRefreshOn('profile', handleRefresh);

  const handleLogout = () => {
    Alert.alert(t('common.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } catch (error) {
            Alert.alert(t('common.error'), t('profile.failedToLogout'));
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleFollowersPress = () => {
    setFollowModalTab('followers');
    setShowFollowModal(true);
  };

  const handleFollowingPress = () => {
    setFollowModalTab('following');
    setShowFollowModal(true);
  };

  const handleUserNavigation = (selectedUser: User) => {
    setShowFollowModal(false);
    navigation.navigate('UserProfile', { username: selectedUser.username });
  };

  const handleTrainingPress = async () => {
    setLoadingTraining(true);
    try {
      const program = await api.getCurrentProgram();
      if (program) {
        // User has active program - go to weeks list
        navigation.navigate('TrainingWeeksList');
      } else {
        // No active program - go to calibration to create one
        navigation.navigate('TrainingCalibration');
      }
    } catch (error: any) {
      // Unexpected error - log it and navigate to calibration
      logger.error('training', 'Failed to check training program', { error });
      navigation.navigate('TrainingCalibration');
    } finally {
      setLoadingTraining(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('profile.title')}</Text>
        </View>
        <EmptyState
          icon="person-outline"
          title={t('profile.signInRequired')}
          message={t('profile.signInDescription')}
          actionLabel={t('common.signIn')}
          onAction={() =>
            navigation.getParent()?.navigate('Auth', { screen: 'Login' })
          }
        />
      </ScreenContainer>
    );
  }

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'newspaper-outline' },
    { label: t('profile.tabs.drafts'), value: 'drafts', icon: 'document-outline' },
    { label: t('profile.tabs.stats'), value: 'stats', icon: 'stats-chart' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'fitness-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  // Extract settings button to avoid duplication
  const renderSettingsButton = () => (
    <TouchableOpacity
      style={styles.settingsButton}
      onPress={() => navigation.navigate('Settings')}
      activeOpacity={0.7}
      hitSlop={SETTINGS_HIT_SLOP}
    >
      <Ionicons name="settings-outline" size={24} color={colors.white} />
    </TouchableOpacity>
  );

  const renderCoverImage = () => {
    const coverStyle = [styles.coverImage, { backgroundColor: colors.primary }];
    const gradientOverlay = (
      <LinearGradient
        colors={['transparent', isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)']}
        style={StyleSheet.absoluteFillObject}
      />
    );

    if (user?.background_image_url) {
      return (
        <ImageBackground
          source={{ uri: fixStorageUrl(user.background_image_url) || undefined }}
          style={coverStyle}
          resizeMode="cover"
        >
          {gradientOverlay}
          {renderSettingsButton()}
        </ImageBackground>
      );
    }

    return (
      <LinearGradient
        colors={isDark ? [colors.primary, '#0f1520'] : [colors.primary, colors.background]}
        style={coverStyle}
      >
        {renderSettingsButton()}
      </LinearGradient>
    );
  };

  const renderProfileHeader = () => (
    <>
      {renderCoverImage()}

      <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}>
          <Avatar uri={user?.avatar} name={user?.name} size="xxl" showTierBadge={tier !== 'free'} tier={tier} />
        </View>

        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username}</Text>

        {user?.bio && <Text style={[styles.bio, { color: colors.textPrimary }]}>{user.bio}</Text>}

        <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.posts.total ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.posts')}</Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats?.activities?.total_distance ? Math.round(stats.activities.total_distance / 1000) : 0} km
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.totalDistance', 'Total')}</Text>
          </View>
          <View style={[styles.statsDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.social.followers ?? 0}</Text>
              {pendingFollowCount > 0 && (
                <View style={[styles.statBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.statBadgeText}>{pendingFollowCount > 99 ? '99+' : pendingFollowCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.followers')}</Text>
          </TouchableOpacity>
          <View style={[styles.statsDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
          <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.social.following ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.following')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={14} color={isDark ? '#0f1729' : '#fff'} />
            <Text style={[styles.actionBtnPrimaryText, { color: isDark ? '#0f1729' : '#fff' }]}>
              {t('profile.editProfile')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnGhost, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            <Ionicons name="log-out-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionBtnGhostText, { color: colors.textSecondary }]}>
              {t('common.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Sections */}
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={[styles.sectionCard, { borderLeftColor: colors.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
            onPress={handleTrainingPress}
            disabled={loadingTraining}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="fitness" size={20} color={colors.primary} />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('training.title')}</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('training.subtitle')}</Text>
            </View>
            {loadingTraining ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { borderLeftColor: colors.info, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
            onPress={() => navigation.navigate('Insights')}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIcon, { backgroundColor: colors.info + '22' }]}>
              <Ionicons name="bar-chart" size={20} color={colors.info} />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('insights.title')}</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('insights.subtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { borderLeftColor: '#8b5cf6', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
            onPress={() => navigation.navigate('TeamsList')}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIcon, { backgroundColor: '#8b5cf622' }]}>
              <Ionicons name="shield" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('teams.teams')}</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('teams.profileSubtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sectionCard, { borderLeftColor: '#06b6d4', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}
            onPress={() => navigation.navigate('RouteLibrary')}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIcon, { backgroundColor: '#06b6d422' }]}>
              <Ionicons name="map" size={20} color="#06b6d4" />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('routes.title')}</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>{t('routes.subtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.value)}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={activeTab === tab.value ? colors.primary : colors.textSecondary}
              />
              {tab.value === 'drafts' && draftsCount > 0 && (
                <View style={[styles.draftsBadge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.draftsBadgeText, { color: colors.white }]}>
                    {draftsCount > 99 ? '99+' : draftsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.tabText, { color: activeTab === tab.value ? colors.primary : colors.textSecondary }]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabSpacer} />

      {/* Activities Tab Content - Sport Filter (inside section) */}
      {activeTab === 'activities' && (
        <View style={styles.activitiesFilterContent}>
          <Text style={[styles.activitiesFilterTitle, { color: colors.textPrimary }]}>
            {t('profile.tabs.activities')}
          </Text>
          <SportTypeFilter
            sportTypes={sportTypes}
            selectedSportTypeId={selectedSportTypeId}
            onSelectSportType={setSelectedSportTypeId}
            isLoading={activitiesData.isLoading}
          />
        </View>
      )}

      {/* Stats Tab Content */}
      {activeTab === 'stats' && (
        <View style={styles.statsTabContent}>
          {/* User Comparison Selector */}
          {canUse('advanced_stats') ? (
            <CompareUserSelector
              following={following}
              selectedUser={compareUser}
              onSelectUser={setCompareUser}
              isLoading={isLoadingFollowing}
            />
          ) : (
            <PremiumTeaser feature="advanced_stats" style={{ marginBottom: spacing.md }}>
              <CompareUserSelector
                following={following}
                selectedUser={null}
                onSelectUser={() => {}}
                isLoading={false}
              />
            </PremiumTeaser>
          )}

          {/* Time Range Filter */}
          <TimeRangeFilter
            options={TIME_RANGE_OPTIONS}
            selectedValue={selectedTimeRange}
            onSelectValue={setSelectedTimeRange}
            isLoading={isLoadingActivityStats || isLoadingCompareStats}
          />

          {/* Sport Type Filter */}
          <SportTypeFilter
            sportTypes={sportTypes}
            selectedSportTypeId={selectedSportTypeId}
            onSelectSportType={setSelectedSportTypeId}
            isLoading={isLoadingActivityStats || isLoadingCompareStats}
          />

          {/* Bar Chart */}
          {activityStats?.by_sport_type && (
            <View style={[styles.chartCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
              <SportStatsChart
                data={activityStats.by_sport_type}
                sportTypes={sportTypes}
                compareData={compareStats?.by_sport_type}
                compareUserName={compareUser?.name}
              />
              {isLoadingCompareStats && (
                <View style={styles.chartLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          )}

          {/* Points Card */}
          <PointsCard
            stats={pointStats}
            isLoading={isLoadingPointStats}
            onViewHistory={() => navigation.navigate('PointHistory')}
            onViewLeaderboard={() => navigation.navigate('Leaderboard')}
          />
        </View>
      )}
    </>
  );

  // Stable ref pattern: FlatList/DraftsTab always receive the same function reference,
  // preventing header unmount/remount (and avatar flicker) on every re-render.
  // The ref is updated each render so the content inside is always fresh.
  const profileHeaderRef = useRef(renderProfileHeader);
  profileHeaderRef.current = renderProfileHeader;
  const stableProfileHeader = useRef(() => profileHeaderRef.current()).current;

  const renderFooter = () => {
    const isLoading =
      (activeTab === 'posts' && postsData.isLoading) ||
      (activeTab === 'activities' && activitiesData.isLoading) ||
      (activeTab === 'events' && eventsData.isLoading);

    if (!isLoading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    // Stats tab content is rendered in header
    if (activeTab === 'stats') return null;

    const isLoading =
      (activeTab === 'posts' && postsData.isLoading && postsData.data.length === 0) ||
      (activeTab === 'activities' && activitiesData.isLoading && activitiesData.data.length === 0) ||
      (activeTab === 'events' && eventsData.isLoading && eventsData.data.length === 0);

    if (isLoading) return null;

    if (activeTab === 'posts') {
      return (
        <EmptyState
          icon="newspaper-outline"
          title={t('profile.empty.noPosts')}
          message={t('profile.empty.noPostsMessage')}
        />
      );
    }
    if (activeTab === 'activities') {
      return (
        <EmptyState
          icon="fitness-outline"
          title={t('profile.empty.noActivities')}
          message={t('profile.empty.noActivitiesMessage')}
        />
      );
    }
    return (
      <EmptyState
        icon="calendar-outline"
        title={t('profile.empty.noEvents')}
        message={t('profile.empty.noEventsMessage')}
      />
    );
  };

  const getData = () => {
    if (activeTab === 'posts') return postsData.data;
    if (activeTab === 'drafts') return []; // Drafts content rendered separately
    if (activeTab === 'stats') return []; // Stats content rendered in header
    if (activeTab === 'activities') return activitiesData.data;
    return eventsData.data;
  };

  const getKeyExtractor = (item: Post | Activity | Event) => {
    return `${activeTab}-${item.id}`;
  };

  const renderItem = ({ item }: { item: Post | Activity | Event }) => {
    if (activeTab === 'posts') {
      const post = item as Post;
      return (
        <PostCard
          post={post}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          onComment={() => navigation.navigate('PostDetail', { postId: post.id, focusComments: true })}
          onUserPress={() => {}}
          onActivityPress={
            post.type === 'activity' && post.activity
              ? () => navigation.navigate('ActivityDetail', { activityId: post.activity!.id })
              : undefined
          }
          onEventPress={
            post.type === 'event' && post.event
              ? () => navigation.navigate('EventDetail', { eventId: post.event!.id })
              : undefined
          }
          isOwner={post.is_owner}
        />
      );
    }
    if (activeTab === 'activities') {
      return (
        <ActivityCard
          activity={item as Activity}
          onPress={() => {
            navigation.navigate('ActivityDetail', { activityId: item.id });
          }}
          showEngagement
        />
      );
    }
    return (
      <EventCard
        event={item as Event}
        onPress={() => {
          navigation.navigate('EventDetail', { eventId: item.id });
        }}
      />
    );
  };

  const handleEndReached = () => {
    if (activeTab === 'posts') {
      postsData.loadMore();
    } else if (activeTab === 'activities') {
      activitiesData.loadMore();
    } else if (activeTab === 'events') {
      eventsData.loadMore();
    }
  };

  return (
    <ScreenContainer>
      {/* Keep DraftsTab mounted but hidden to prevent blinking on tab switch */}
      <View style={[styles.tabContent, activeTab !== 'drafts' && styles.hiddenTab]}>
        <DraftsTab
          isOwnProfile={true}
          ListHeaderComponent={stableProfileHeader}
          contentPaddingBottom={tabBarPaddingBottom}
          onPublishSuccess={() => {
            // Refresh posts tab after successful publish
            postsData.refresh();
            fetchDraftsCount();
            // Switch to posts tab
            setActiveTab('posts');
          }}
          onDeleteSuccess={() => {
            fetchDraftsCount();
          }}
          onEditDraft={(draft) => {
            // Navigate to PostForm for editing
            navigation.navigate('PostForm', { postId: draft.id });
          }}
        />
      </View>
      <View style={[styles.tabContent, activeTab === 'drafts' && styles.hiddenTab]}>
        <FlatList
          data={getData()}
          keyExtractor={getKeyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={stableProfileHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
        />
      </View>

      {user && (
        <UserListModal
          visible={showFollowModal}
          onClose={() => { setShowFollowModal(false); fetchPendingFollowCount(); }}
          userId={user.id}
          initialTab={followModalTab}
          isOwnProfile={true}
          onUserPress={handleUserNavigation}
          pendingRequestsCount={pendingFollowCount}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  hiddenTab: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginHorizontal:0
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tabSpacer: {
    height: spacing.md,
  },
  coverImage: {
    height: 160,
    position: 'relative',
    marginHorizontal: -spacing.md, // Counteract FlatList contentContainerStyle padding
  },
  settingsButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.md,
  },
  avatarContainer: {
    marginTop: -40,
    borderWidth: 4,
    borderRadius: 44,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  username: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  statsDivider: {
    width: 1,
    height: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: spacing.md,
    marginHorizontal: spacing.sm, // same as sectionGroup
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
  },
  actionBtnPrimaryText: {
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
  },
  actionBtnGhostText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.md,
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
  tabIconContainer: {
    position: 'relative',
  },
  draftsBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  draftsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statsTabContent: {
    marginTop: spacing.sm,
  },
  activitiesFilterContent: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  activitiesFilterTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
  },
  chartLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  sectionGroup: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    gap: 10,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionText: {
    flex: 1,
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
