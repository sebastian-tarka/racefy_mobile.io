import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityCard,
  Avatar,
  CompareUserSelector,
  DraftPostCard,
  EmptyState,
  EventCard,
  type PeriodOption,
  PointsCard,
  PostCard,
  PremiumTeaser,
  ProfileNavigationSections,
  ScreenContainer,
  SportStatsChart,
  SportTypeFilter,
  type TimeRange,
  TimeRangeFilter,
  UserListModal,
} from '../../components';
import { useTabBarPadding } from '../../navigation/useTabBarPadding';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../hooks/useTheme';
import { useUnits } from '../../hooks/useUnits';
import { useActivityStats } from '../../hooks/useActivityStats';
import { usePointStats } from '../../hooks/usePointStats';
import { useSportTypes } from '../../hooks/useSportTypes';
import { useFollowing } from '../../hooks/useFollowing';
import { usePaginatedTabData } from '../../hooks/usePaginatedTabData';
import { useDrafts } from '../../hooks/useDrafts';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, spacing, msFont } from '../../theme';
import { getDateRangeForTimeRange } from '../../utils/dateRanges';
import { formatDurationCompact } from '../../utils/formatDuration';
import type { BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type {
  Activity,
  ActivityStats,
  DraftPost,
  Event,
  Post,
  User,
  UserStats,
} from '../../types/api';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

type TabType = 'posts' | 'drafts' | 'stats' | 'activities' | 'events';

/**
 * Sentinel row carrying whatever the active tab needs above its content
 * (sport filter, the whole stats block). It rides in the data instead of the
 * header so the sticky tab bar stays a tab bar and nothing else.
 */
const EXTRAS_ROW = { id: -1, extras: true } as const;
type ExtrasRow = typeof EXTRAS_ROW;
type ListRow = Post | Activity | Event | DraftPost | ExtrasRow;

const isExtrasRow = (row: ListRow): row is ExtrasRow => 'extras' in row;

/** How long a loaded tab is reused before a switch back refetches it. */
const TAB_STALE_MS = 2 * 60 * 1000;

const INITIAL_PAGE = 1;
const SETTINGS_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const TIME_RANGE_OPTIONS: PeriodOption<TimeRange>[] = [
  { value: 'all_time', labelKey: 'profile.stats.timeRange.allTime' },
  { value: 'year', labelKey: 'profile.stats.timeRange.year' },
  { value: 'month', labelKey: 'profile.stats.timeRange.month' },
  { value: 'week', labelKey: 'profile.stats.timeRange.week' },
];

export function ProfileScreen({
  navigation,
  route,
}: Props & { navigation: ProfileScreenNavigationProp }) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();
  const { formatTotalDistance } = useUnits();
  const { canUse, tier } = useSubscription();
  const tabBarPaddingBottom = useTabBarPadding();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'posts');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draftsCount, setDraftsCount] = useState(0);

  // Modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | 'requests'>(
    'followers',
  );
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
  const {
    stats: activityStats,
    isLoading: isLoadingActivityStats,
    refetch: refetchActivityStats,
  } = useActivityStats({
    sportTypeId: selectedSportTypeId,
    from: dateRange?.from ?? undefined,
    to: dateRange?.to ?? undefined,
  });
  const {
    stats: pointStats,
    isLoading: isLoadingPointStats,
    refetch: refetchPointStats,
  } = usePointStats();
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
        logger.error('api', 'Failed to fetch compare user stats', {
          error,
          userId: compareUser.id,
        });
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

  const fetchActivitiesWrapper = useCallback(
    (userId: number, page: number) => {
      return api.getActivities({
        user_id: userId,
        page,
        ...(selectedSportTypeId && { sport_type_id: selectedSportTypeId }),
      });
    },
    [selectedSportTypeId],
  );

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

  // Drafts live in the same list as every other tab. `useDrafts` does not
  // auto-load, so nothing is fetched until the tab is actually opened — the
  // badge count comes from its own one-item request.
  const draftsData = useDrafts();
  const [publishingDraftId, setPublishingDraftId] = useState<number | null>(null);

  const listRef = useRef<SectionList<ListRow>>(null);
  const scrollOffsetRef = useRef(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  /** When each tab last loaded — a tab switch inside the window reuses what it has. */
  const lastLoadedRef = useRef<Partial<Record<TabType, number>>>({});
  /** Mirrors the loaded drafts count so the badge can spot a stale list. */
  const loadedDraftsCountRef = useRef(0);

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
      // The badge is the cheapest staleness check we have: a total that no
      // longer matches the loaded list means a draft appeared (or went) behind
      // our back, so the cached tab must not be reused.
      if (response.meta.total !== loadedDraftsCountRef.current) {
        delete lastLoadedRef.current.drafts;
      }
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
      if (!isAuthenticated) return;
      fetchDraftsCount();
      // A draft can appear without the app doing anything — the server writes
      // one after an activity when AI posts are on. Coming back to the screen
      // is the only signal we get, so the open drafts tab reloads on focus
      // rather than waiting for someone to pull down.
      if (activeTab === 'drafts') {
        loadTab('drafts', { force: true });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, activeTab]),
  );

  /**
   * Load a tab, reusing what it already holds when that is recent enough.
   *
   * Refetching on every switch meant a trip to Stats and back threw away a
   * list that was seconds old, and paid for it with a spinner. `force` is for
   * pull-to-refresh and for data we know has changed underneath us.
   */
  const loadTab = useCallback(
    (tab: TabType, { force = false }: { force?: boolean } = {}) => {
      const source = {
        posts: {
          isLoading: postsData.isLoading,
          count: postsData.data.length,
          refresh: postsData.refresh,
        },
        drafts: {
          isLoading: draftsData.isLoading,
          count: draftsData.drafts.length,
          refresh: draftsData.refresh,
        },
        activities: {
          isLoading: activitiesData.isLoading,
          count: activitiesData.data.length,
          refresh: activitiesData.refresh,
        },
        events: {
          isLoading: eventsData.isLoading,
          count: eventsData.data.length,
          refresh: eventsData.refresh,
        },
        stats: {
          isLoading: isLoadingActivityStats,
          count: activityStats ? 1 : 0,
          refresh: () => {
            refetchActivityStats();
            refetchPointStats();
          },
        },
      }[tab];

      if (source.isLoading) return;

      const loadedAt = lastLoadedRef.current[tab];
      const isFresh = loadedAt !== undefined && Date.now() - loadedAt < TAB_STALE_MS;
      if (!force && isFresh && source.count > 0) {
        logger.debug('profile', 'Tab still fresh, keeping what it has', { tab });
        return;
      }

      logger.info('profile', 'Loading tab data', { tab, force });
      lastLoadedRef.current[tab] = Date.now();
      source.refresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      postsData.isLoading,
      postsData.data.length,
      draftsData.isLoading,
      draftsData.drafts.length,
      activitiesData.isLoading,
      activitiesData.data.length,
      eventsData.isLoading,
      eventsData.data.length,
      isLoadingActivityStats,
      activityStats,
    ],
  );

  useEffect(() => {
    loadedDraftsCountRef.current = draftsData.drafts.length;
  }, [draftsData.drafts.length]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  // Switching tabs while scrolled deep used to leave you staring at whatever
  // offset the previous tab happened to be at. Pin to the top of the content
  // instead — the sticky bar is already there.
  useEffect(() => {
    if (headerHeight > 0 && scrollOffsetRef.current > headerHeight) {
      // Optional all the way down: the scroll responder is not there in every
      // environment, and a tab switch must never be able to throw.
      listRef.current?.getScrollResponder()?.scrollTo?.({ y: headerHeight, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refresh activities when sport type filter changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 'activities') {
      activitiesData.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSportTypeId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    lastLoadedRef.current[activeTab] = Date.now();
    await fetchStats();

    if (activeTab === 'drafts') {
      await draftsData.refresh();
    } else if (activeTab === 'posts') {
      await postsData.refresh();
    } else if (activeTab === 'stats') {
      await Promise.all([refetchActivityStats(), refetchPointStats()]);
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

  const openEditProfile = () => navigation.navigate('EditProfile');

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

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'newspaper-outline' },
    { label: t('profile.tabs.drafts'), value: 'drafts', icon: 'document-outline' },
    { label: t('profile.tabs.stats'), value: 'stats', icon: 'stats-chart' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'fitness-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  const handlePublishDraft = (draft: DraftPost) => {
    Alert.alert(t('drafts.confirmPublishTitle'), t('drafts.confirmPublish'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('drafts.publish'),
        onPress: async () => {
          setPublishingDraftId(draft.id);
          try {
            await draftsData.publishDraft(draft.id);
            Alert.alert(t('common.success'), t('drafts.published'));
            // The draft is a post now - it belongs in the tab we send them to.
            postsData.refresh();
            fetchDraftsCount();
            setActiveTab('posts');
          } catch (error) {
            Alert.alert(t('common.error'), t('drafts.publishFailed'));
            logger.error('api', 'Profile draft publish error', { error });
          } finally {
            setPublishingDraftId(null);
          }
        },
      },
    ]);
  };

  const handleDeleteDraft = (draft: DraftPost) => {
    Alert.alert(t('drafts.confirmDeleteTitle'), t('drafts.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await draftsData.deleteDraft(draft.id);
            fetchDraftsCount();
          } catch (error) {
            Alert.alert(t('common.error'), t('drafts.deleteFailed'));
            logger.error('api', 'Profile draft delete error', { error });
          }
        },
      },
    ]);
  };

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

  // Wrapped in a measured View: knowing where the header ends is what lets a
  // tab switch land on the content instead of somewhere in the middle of it.
  const renderProfileHeader = () => (
    <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
      <View
        style={[
          styles.profileCard,
          { backgroundColor: colors.cardBackground, borderColor: colors.borderLight },
        ]}
      >
        {renderCoverImage()}

        <View style={styles.profileBody}>
          {/* The avatar is the thing people reach for when they want to change
              it, so it goes where the edit screen is — three taps through
              Settings was the old route. */}
          <View style={styles.identityRow}>
            <TouchableOpacity
              style={[styles.avatarContainer, { borderColor: colors.cardBackground }]}
              onPress={openEditProfile}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('editProfile.title')}
            >
              <Avatar
                uri={user?.avatar}
                name={user?.name}
                size="xxl"
                showTierBadge={tier !== 'free'}
                tier={tier}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.border }]}
              onPress={openEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.editButtonText, { color: colors.textPrimary }]}>
                {t('editProfile.title')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {user?.name}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
            @{user?.username}
          </Text>
          {user?.bio && (
            <Text style={[styles.bio, { color: colors.textPrimary }]} numberOfLines={2}>
              {user.bio}
            </Text>
          )}

          {/* Training and social used to share one row of four columns, with
              the distance labelled "Total" — total of what was anyone's guess.
              Three named training metrics, then the social pair on its own. */}
          <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.activities')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.activities?.total ?? 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.distance')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatTotalDistance(stats?.activities?.total_distance ?? 0)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.time')}
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {formatDurationCompact(stats?.activities?.total_duration ?? 0)}
              </Text>
            </View>
          </View>

          {/* All-time numbers say nothing about how it is going right now. */}
          {(stats?.activities?.this_month ?? 0) > 0 && (
            <Text style={[styles.thisMonth, { color: colors.textSecondary }]}>
              {t('profile.stats.thisMonth', { count: stats?.activities?.this_month ?? 0 })}
            </Text>
          )}

          <View style={[styles.socialRow, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity style={styles.socialItem} onPress={handleFollowersPress}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.social.followers ?? 0}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.followers')}
              </Text>
              {pendingFollowCount > 0 && (
                <View style={[styles.statBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.statBadgeText}>
                    {pendingFollowCount > 99 ? '99+' : pendingFollowCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[styles.socialDivider, { backgroundColor: colors.borderLight }]} />
            <TouchableOpacity style={styles.socialItem} onPress={handleFollowingPress}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats?.social.following ?? 0}
              </Text>
              <Text style={[styles.socialLabel, { color: colors.textSecondary }]}>
                {t('profile.stats.following')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Navigation Sections */}
      <ProfileNavigationSections navigation={navigation} tier={tier} />
    </View>
  );

  // Sticky section header: once you have scrolled past the profile, the tabs
  // stay within reach instead of forcing a trip back to the top.
  const renderTabBar = () => (
    <View style={[styles.stickyTabs, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        ]}
      >
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
              style={[
                styles.tabText,
                { color: activeTab === tab.value ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Whatever the active tab needs above its rows. Rendered as the first row so
  // it scrolls away under the sticky tab bar instead of being pinned with it.
  const renderTabExtras = () => (
    <>
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
            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.borderLight },
              ]}
            >
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

  // Not authenticated: render the sign-in prompt. Placed AFTER all hooks above
  // so the Rules of Hooks hold.
  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('profile.title')}</Text>
        </View>
        <EmptyState
          icon="person-outline"
          title={t('profile.signInRequired')}
          message={t('profile.signInDescription')}
          actionLabel={t('common.signIn')}
          onAction={() => navigation.getParent()?.navigate('Auth', { screen: 'Login' })}
        />
      </ScreenContainer>
    );
  }

  const renderFooter = () => {
    const isLoading =
      (activeTab === 'posts' && postsData.isLoading) ||
      (activeTab === 'drafts' && draftsData.isLoading) ||
      (activeTab === 'activities' && activitiesData.isLoading) ||
      (activeTab === 'events' && eventsData.isLoading);

    if (isLoading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    // The empty state lives here rather than in `ListEmptyComponent`: tabs that
    // carry an extras row are never "empty" as far as the list is concerned.
    return renderEmpty();
  };

  const renderEmpty = () => {
    // The stats tab renders its whole content as the extras row.
    if (activeTab === 'stats') return null;

    const hasRows =
      (activeTab === 'posts' && postsData.data.length > 0) ||
      (activeTab === 'drafts' && draftsData.drafts.length > 0) ||
      (activeTab === 'activities' && activitiesData.data.length > 0) ||
      (activeTab === 'events' && eventsData.data.length > 0);
    if (hasRows) return null;

    const isLoading =
      (activeTab === 'posts' && postsData.isLoading && postsData.data.length === 0) ||
      (activeTab === 'drafts' && draftsData.isLoading && draftsData.drafts.length === 0) ||
      (activeTab === 'activities' &&
        activitiesData.isLoading &&
        activitiesData.data.length === 0) ||
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
    if (activeTab === 'drafts') {
      return (
        <EmptyState
          icon="document-outline"
          title={t('drafts.noDrafts')}
          message={t('drafts.noDraftsDesc')}
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

  const getData = (): ListRow[] => {
    if (activeTab === 'stats') return [EXTRAS_ROW];
    if (activeTab === 'activities') return [EXTRAS_ROW, ...activitiesData.data];
    if (activeTab === 'posts') return postsData.data;
    if (activeTab === 'drafts') return draftsData.drafts;
    return eventsData.data;
  };

  const getKeyExtractor = (item: ListRow) => {
    return `${activeTab}-${item.id}`;
  };

  const renderItem = ({ item }: { item: ListRow }) => {
    if (isExtrasRow(item)) {
      return renderTabExtras();
    }
    if (activeTab === 'drafts') {
      const draft = item as DraftPost;
      return (
        <DraftPostCard
          post={draft}
          onPublish={() => handlePublishDraft(draft)}
          onEdit={() => navigation.navigate('PostForm', { postId: draft.id })}
          onDelete={() => handleDeleteDraft(draft)}
          isPublishing={publishingDraftId === draft.id}
        />
      );
    }
    if (activeTab === 'posts') {
      const post = item as Post;
      return (
        <PostCard
          post={post}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          onComment={() =>
            navigation.navigate('PostDetail', { postId: post.id, focusComments: true })
          }
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
    if (activeTab === 'drafts') {
      draftsData.loadMore();
    } else if (activeTab === 'posts') {
      postsData.loadMore();
    } else if (activeTab === 'activities') {
      activitiesData.loadMore();
    } else if (activeTab === 'events') {
      eventsData.loadMore();
    }
  };

  return (
    <ScreenContainer>
      {/* One list for every tab, drafts included. Two lists meant the profile
          header — cover, avatar and the whole navigation block — was mounted
          twice, so its data hooks fired twice on every visit. */}
      <SectionList
        ref={listRef}
        sections={[{ data: getData() }]}
        keyExtractor={getKeyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderTabBar}
        stickySectionHeadersEnabled
        ListHeaderComponent={renderProfileHeader()}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={0}
          />
        }
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
      />

      {user && (
        <UserListModal
          visible={showFollowModal}
          onClose={() => {
            setShowFollowModal(false);
            fetchPendingFollowCount();
          }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginHorizontal: 0,
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
  coverImage: {
    height: 160,
    position: 'relative',
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
  profileCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  profileBody: {
    alignItems: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    marginTop: -44,
    borderWidth: 4,
    borderRadius: 44,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  thisMonth: {
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: spacing.md,
  },
  socialLabel: {
    fontSize: fontSize.sm,
  },
  socialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
    marginRight: spacing.md,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  username: {
    fontSize: fontSize.md,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  statBadge: {
    minWidth: 18,
    minHeight: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBadgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: msFont(11),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  stickyTabs: {
    // The bar is pinned by SectionList, so the gap below it has to be opaque
    // padding on the pinned element — with a margin the rows show through it.
    paddingBottom: spacing.md,
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
    minHeight: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  draftsBadgeText: {
    fontSize: msFont(9),
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
});
