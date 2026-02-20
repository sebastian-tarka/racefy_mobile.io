import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  Avatar,
  Button,
  DraftsTab,
  EmptyState,
  PostCard,
  ActivityCard,
  EventCard,
  SportStatsChart,
  PointsCard,
  CompareUserSelector,
  UserListModal,
  SportTypeFilter,
  TimeRangeFilter,
  ScreenContainer,
  type TimeRange,
  type PeriodOption,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useActivityStats } from '../../hooks/useActivityStats';
import { usePointStats } from '../../hooks/usePointStats';
import { useSportTypes } from '../../hooks/useSportTypes';
import { useFollowing } from '../../hooks/useFollowing';
import { usePaginatedTabData } from '../../hooks/usePaginatedTabData';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
import { fixStorageUrl } from '../../config/api';
import { spacing, fontSize, borderRadius } from '../../theme';
import { getDateRangeForTimeRange } from '../../utils/dateRanges';
import type { BottomTabScreenProps, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type { UserStats, Post, Activity, Event, User, ActivityStats } from '../../types/api';

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
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'posts');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTraining, setLoadingTraining] = useState(false);

  // Modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | 'requests'>('followers');

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

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        // Only fetch stats once when screen is focused
        fetchStats();
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

    if (user?.background_image_url) {
      return (
        <ImageBackground
          source={{ uri: fixStorageUrl(user.background_image_url) || undefined }}
          style={coverStyle}
          resizeMode="cover"
        >
          {renderSettingsButton()}
        </ImageBackground>
      );
    }

    return (
      <View style={coverStyle}>
        {renderSettingsButton()}
      </View>
    );
  };

  const renderProfileHeader = () => (
    <>
      {renderCoverImage()}

      <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}>
          <Avatar uri={user?.avatar} name={user?.name} size="xxl" />
        </View>

        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username}</Text>

        {user?.bio && <Text style={[styles.bio, { color: colors.textPrimary }]}>{user.bio}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.posts.total ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.posts')}</Text>
          </View>
          <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.social.followers ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.followers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.social.following ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.stats.following')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('profile.editProfile')}
            onPress={() => navigation.navigate('EditProfile')}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title={t('common.logout')}
            onPress={handleLogout}
            variant="ghost"
            loading={isLoggingOut}
            style={styles.actionButton}
          />
        </View>

        {/* Training Plans Card */}
        <TouchableOpacity
          style={[styles.trainingCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
          onPress={handleTrainingPress}
          disabled={loadingTraining}
          activeOpacity={0.7}
        >
          <View style={[styles.trainingIconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="fitness" size={28} color={colors.white} />
          </View>
          <View style={styles.trainingContent}>
            <Text style={[styles.trainingTitle, { color: colors.textPrimary }]}>
              {t('training.title')}
            </Text>
            <Text style={[styles.trainingSubtitle, { color: colors.textSecondary }]}>
              {t('training.subtitle')}
            </Text>
          </View>
          {loadingTraining ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab.value)}
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
      <View style={styles.tabSpacer} />

      {/* Activities Tab Content - Sport Filter */}
      {activeTab === 'activities' && (
        <View style={styles.activitiesFilterContent}>
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
          <CompareUserSelector
            following={following}
            selectedUser={compareUser}
            onSelectUser={setCompareUser}
            isLoading={isLoadingFollowing}
          />

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

  const handleLikePost = async (post: Post) => {
    try {
      if (post.is_liked) {
        await api.unlikePost(post.id);
      } else {
        await api.likePost(post.id);
      }
      // Refresh posts to get updated like status from server
      await postsData.refresh();
    } catch (error) {
      logger.error('api', 'Failed to like/unlike post', { error, postId: post.id, action: post.is_liked ? 'unlike' : 'like' });
    }
  };

  const renderItem = ({ item }: { item: Post | Activity | Event }) => {
    if (activeTab === 'posts') {
      const post = item as Post;
      return (
        <PostCard
          post={post}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          onLike={() => handleLikePost(post)}
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
          ListHeaderComponent={renderProfileHeader}
          onPublishSuccess={() => {
            // Refresh posts tab after successful publish
            postsData.refresh();
            // Switch to posts tab
            setActiveTab('posts');
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
          ListHeaderComponent={renderProfileHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
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
          onClose={() => setShowFollowModal(false)}
          userId={user.id}
          initialTab={followModalTab}
          isOwnProfile={true}
          onUserPress={handleUserNavigation}
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
    height: 120,
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
    borderBottomWidth: 1,
    marginHorizontal: -spacing.md, // Counteract FlatList contentContainerStyle padding
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
    marginTop: spacing.xl,
    gap: spacing.xxxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 120,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: -spacing.md, // Counteract FlatList contentContainerStyle padding
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
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statsTabContent: {
    marginTop: spacing.sm,
  },
  activitiesFilterContent: {
    marginTop: spacing.sm,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
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
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  trainingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: 2,
  },
  trainingSubtitle: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
});
