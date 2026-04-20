import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import Svg, {Circle} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  ScreenContainer,
  type TimeRange,
  TimeRangeFilter,
  UserListModal,
} from '../../components';
import {useAuth} from '../../hooks/useAuth';
import {useTheme} from '../../hooks/useTheme';
import {useActivityStats} from '../../hooks/useActivityStats';
import {usePointStats} from '../../hooks/usePointStats';
import {useSportTypes} from '../../hooks/useSportTypes';
import {useFollowing} from '../../hooks/useFollowing';
import {usePaginatedTabData} from '../../hooks/usePaginatedTabData';
import {useWeeklyStreak} from '../../hooks/useWeeklyStreak';
import {api} from '../../services/api';
import {logger} from '../../services/logger';
import {useRefreshOn} from '../../services/refreshEvents';
import {fixStorageUrl} from '../../config/api';
import {borderRadius, fontSize, spacing} from '../../theme';
import {formatTotalTime} from '../../utils/formatters';
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

// Sport color mapping for breakdown bars
const SPORT_COLORS: Record<string, string> = {
  running: '#10B981',
  cycling: '#F59E0B',
  walking: '#8B5CF6',
  swimming: '#3B82F6',
  hiking: '#F97316',
  gym: '#EF4444',
  yoga: '#EC4899',
  tennis: '#06B6D4',
  football: '#84CC16',
  basketball: '#F43F5E',
};

const DEFAULT_SPORT_COLOR = '#6B7280';

function getSportColor(slug: string): string {
  return SPORT_COLORS[slug] || DEFAULT_SPORT_COLOR;
}

// Sport emoji mapping for dynamic UI
const SPORT_EMOJI: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  walking: '🚶',
  swimming: '🏊',
  hiking: '🥾',
  gym: '🏋️',
  yoga: '🧘',
  tennis: '🎾',
  football: '⚽',
  basketball: '🏀',
  skiing: '⛷️',
  snowboarding: '🏂',
  skating: '⛸️',
  triathlon: '🏅',
};

const DEFAULT_SPORT_EMOJI = '🏅';

function getSportEmoji(slug: string): string {
  return SPORT_EMOJI[slug] || DEFAULT_SPORT_EMOJI;
}

// Circular Progress Ring component using react-native-svg
function CircularProgressRing({
  progress,
  size = 80,
  strokeWidth = 3,
  trackColor,
  progressColor,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </View>
    </View>
  );
}

export function DynamicProfileScreen({ navigation, route }: Props & { navigation: ProfileScreenNavigationProp }) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { colors } = useTheme();
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

  // Filter state
  const [selectedSportTypeId, setSelectedSportTypeId] = useState<number | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all_time');

  // Comparison state
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [compareStats, setCompareStats] = useState<ActivityStats | null>(null);
  const [isLoadingCompareStats, setIsLoadingCompareStats] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  // Weekly streak
  const { completedDays: streakDays } = useWeeklyStreak();

  // Update active tab when navigating with initialTab param
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const result = getDateRangeForTimeRange(selectedTimeRange);
    logger.debug('profile', 'Date range calculated', { selectedTimeRange, result });
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

  const fetchDraftsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.getDrafts({ page: 1, per_page: 1 });
      setDraftsCount(response.meta.total);
    } catch (error) {
      logger.error('api', 'Failed to fetch drafts count', { error });
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchStats();
        fetchDraftsCount();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated])
  );

  // Load data when tab changes
  useEffect(() => {
    if (!isAuthenticated) return;

    logger.debug('profile', 'Tab changed, loading fresh data', { activeTab });

    if (activeTab === 'posts') {
      if (!postsData.isLoading) {
        postsData.refresh();
      }
    } else if (activeTab === 'activities') {
      if (!activitiesData.isLoading) {
        activitiesData.refresh();
      }
    } else if (activeTab === 'events') {
      if (!eventsData.isLoading) {
        eventsData.refresh();
      }
    } else if (activeTab === 'stats') {
      if (!isLoadingActivityStats) {
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
        navigation.navigate('TrainingWeeksList');
      } else {
        navigation.navigate('TrainingCalibration');
      }
    } catch (error: any) {
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('profile.title')}</Text>
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

  const tabs: { label: string; value: TabType; emoji: string }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', emoji: '📝' },
    { label: t('profile.tabs.drafts'), value: 'drafts', emoji: '📄' },
    { label: t('profile.tabs.stats'), value: 'stats', emoji: '📊' },
    { label: t('profile.tabs.activities'), value: 'activities', emoji: '💪' },
    { label: t('profile.tabs.events'), value: 'events', emoji: '📅' },
  ];

  // Compute total distance for sport breakdown percentage
  const totalSportDistance = useMemo(() => {
    if (!activityStats?.by_sport_type) return 0;
    return Object.values(activityStats.by_sport_type).reduce((sum, s) => sum + s.distance, 0);
  }, [activityStats?.by_sport_type]);

  const renderCoverImage = () => {
    const coverStyle = [styles.coverImage, { backgroundColor: colors.primary }];

    const settingsButton = (
      <TouchableOpacity
        style={styles.coverSettingsButton}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.7}
        hitSlop={SETTINGS_HIT_SLOP}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
      </TouchableOpacity>
    );

    if (user?.background_image_url) {
      return (
        <ImageBackground
          source={{ uri: fixStorageUrl(user.background_image_url) || undefined }}
          style={coverStyle}
          resizeMode="cover"
        >
          {settingsButton}
        </ImageBackground>
      );
    }

    return (
      <View style={coverStyle}>
        {settingsButton}
      </View>
    );
  };

  const renderProfileHeader = () => (
    <>
      {/* Cover Image */}
      {renderCoverImage()}

      {/* Compact Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {/* Avatar + Info row */}
        <View style={styles.avatarInfoRow}>
          {/* Avatar with circular progress ring */}
          <View style={styles.avatarWrapper}>
            <CircularProgressRing
              progress={(user as any)?.level_progress ?? 0}
              size={80}
              strokeWidth={3}
              trackColor={colors.primary + '1F'}
              progressColor={colors.primary}
            >
              <Avatar uri={user?.avatar} name={user?.name} size="xl" />
            </CircularProgressRing>
            {/* Level badge - shown when API provides level data */}
            {(user as any)?.level != null && (
              <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.levelBadgeText, { color: colors.white }]}>
                  {(user as any).level}
                </Text>
              </View>
            )}
          </View>

          {/* Name + follower stats */}
          <View style={styles.infoColumn}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
              @{user?.username}
            </Text>
            {/* Compact posts/followers/following */}
            <View style={styles.compactStatsRow}>
              <View style={styles.compactStatItem}>
                <Text style={[styles.compactStatValue, { color: colors.textPrimary }]}>
                  {stats?.posts.total ?? 0}
                </Text>
                <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>
                  {t('profile.stats.posts')}
                </Text>
              </View>
              <TouchableOpacity style={styles.compactStatItem} onPress={handleFollowersPress}>
                <Text style={[styles.compactStatValue, { color: colors.textPrimary }]}>
                  {stats?.social.followers ?? 0}
                </Text>
                <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>
                  {t('profile.stats.followers')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactStatItem} onPress={handleFollowingPress}>
                <Text style={[styles.compactStatValue, { color: colors.textPrimary }]}>
                  {stats?.social.following ?? 0}
                </Text>
                <Text style={[styles.compactStatLabel, { color: colors.textMuted }]}>
                  {t('profile.stats.following')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Stat Badges: Points, Rank, Streak */}
        <View style={styles.badgesRow}>
          <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => navigation.navigate('PointHistory')}
            activeOpacity={0.7}
          >
            <Ionicons name="flash" size={18} color={colors.primary} />
            <View style={styles.badgeTextContainer}>
              <Text style={[styles.badgeValue, { color: colors.textPrimary }]}>
                {pointStats?.total_points?.toLocaleString() ?? 0}
              </Text>
              <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>
                {t('profile.points.title')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy" size={18} color="#F59E0B" />
            <View style={styles.badgeTextContainer}>
              <Text style={[styles.badgeValue, { color: colors.textPrimary }]}>
                #{pointStats?.global_rank ?? '-'}
              </Text>
              <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>
                {t('profile.points.globalRank')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.badge, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="flame" size={18} color="#EF4444" />
            <View style={styles.badgeTextContainer}>
              <Text style={[styles.badgeValue, { color: colors.textPrimary }]}>
                {streakDays}
              </Text>
              <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>
                {t('profile.streak')}
              </Text>
            </View>
          </View>
        </View>

        {/* Training Plans Banner */}
        <TouchableOpacity
          style={[styles.trainingCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
          onPress={handleTrainingPress}
          disabled={loadingTraining}
          activeOpacity={0.7}
        >
          <View style={[styles.trainingIconContainer, { backgroundColor: colors.primary }]}>
            <Ionicons name="fitness" size={20} color={colors.white} />
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
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* Quick navigation: Insights / Teams / Routes */}
        <View style={styles.quickNavRow}>
          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: colors.info + '10', borderColor: colors.info + '40' }]}
            onPress={() => navigation.navigate('Insights')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: colors.info + '22' }]}>
              <Ionicons name="bar-chart" size={18} color={colors.info} />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {t('insights.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: '#8b5cf610', borderColor: '#8b5cf640' }]}
            onPress={() => navigation.navigate('TeamsList')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: '#8b5cf622' }]}>
              <Ionicons name="shield" size={18} color="#8b5cf6" />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {t('teams.teams')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickNavCard, { backgroundColor: '#06b6d410', borderColor: '#06b6d440' }]}
            onPress={() => navigation.navigate('RouteLibrary')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickNavIcon, { backgroundColor: '#06b6d422' }]}>
              <Ionicons name="map" size={18} color="#06b6d4" />
            </View>
            <Text style={[styles.quickNavLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {t('routes.title')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer between header and tabs */}
      <View style={styles.headerTabSpacer} />

      {/* Pill-style Tab Bar */}
      <View style={[styles.pillTabContainer, { backgroundColor: colors.border + '40' }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.pillTab,
              activeTab === tab.value && [styles.pillTabActive, {
                backgroundColor: colors.cardBackground,
                shadowColor: colors.textPrimary,
              }],
            ]}
            onPress={() => setActiveTab(tab.value)}
          >
            <View style={styles.pillTabIconContainer}>
              <Text style={styles.pillTabEmoji}>{tab.emoji}</Text>
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
                styles.pillTabText,
                {
                  color: activeTab === tab.value ? colors.textPrimary : colors.textMuted,
                  fontWeight: activeTab === tab.value ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabSpacer} />

      {/* Activities Tab Content - Sport Filter */}
      {activeTab === 'activities' && (
        <View style={styles.filterContent}>
          <View style={styles.emojiFilterRow}>
            <TouchableOpacity
              style={[
                styles.emojiFilterItem,
                {
                  backgroundColor: selectedSportTypeId === null ? colors.primary : colors.cardBackground,
                  borderColor: selectedSportTypeId === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedSportTypeId(null)}
              disabled={activitiesData.isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiFilterIcon}>{DEFAULT_SPORT_EMOJI}</Text>
              <Text style={[
                styles.emojiFilterLabel,
                { color: selectedSportTypeId === null ? colors.white : colors.textSecondary },
              ]}>
                {t('profile.stats.allSports')}
              </Text>
            </TouchableOpacity>
            {sportTypes.map((sport) => {
              const isSelected = selectedSportTypeId === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.emojiFilterItem,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSportTypeId(sport.id)}
                  disabled={activitiesData.isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiFilterIcon}>{getSportEmoji(sport.slug)}</Text>
                  <Text style={[
                    styles.emojiFilterLabel,
                    { color: isSelected ? colors.white : colors.textSecondary },
                  ]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Stats Tab Content */}
      {activeTab === 'stats' && (
        <View style={styles.statsTabContent}>
          {/* Summary Cards Row */}
          {activityStats?.totals && (
            <View style={styles.summaryCardsRow}>
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {(activityStats.totals.distance / 1000).toFixed(1)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  {t('profile.totalKm')}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {activityStats.count}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  {t('profile.totalActivities')}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.summaryValueSmall, { color: colors.textPrimary }]}>
                  {formatTotalTime(activityStats.totals.duration)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  {t('profile.totalTime')}
                </Text>
              </View>
            </View>
          )}

          {/* Time Range Filter */}
          <TimeRangeFilter
            options={TIME_RANGE_OPTIONS}
            selectedValue={selectedTimeRange}
            onSelectValue={setSelectedTimeRange}
            isLoading={isLoadingActivityStats || isLoadingCompareStats}
          />

          {/* Sport Type Filter */}
          <View style={styles.emojiFilterRow}>
            <TouchableOpacity
              style={[
                styles.emojiFilterItem,
                {
                  backgroundColor: selectedSportTypeId === null ? colors.primary : colors.cardBackground,
                  borderColor: selectedSportTypeId === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedSportTypeId(null)}
              disabled={isLoadingActivityStats || isLoadingCompareStats}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiFilterIcon}>{DEFAULT_SPORT_EMOJI}</Text>
              <Text style={[
                styles.emojiFilterLabel,
                { color: selectedSportTypeId === null ? colors.white : colors.textSecondary },
              ]}>
                {t('profile.stats.allSports')}
              </Text>
            </TouchableOpacity>
            {sportTypes.map((sport) => {
              const isSelected = selectedSportTypeId === sport.id;
              return (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.emojiFilterItem,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSportTypeId(sport.id)}
                  disabled={isLoadingActivityStats || isLoadingCompareStats}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiFilterIcon}>{getSportEmoji(sport.slug)}</Text>
                  <Text style={[
                    styles.emojiFilterLabel,
                    { color: isSelected ? colors.white : colors.textSecondary },
                  ]}>
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Activity Breakdown Bars */}
          {activityStats?.by_sport_type && totalSportDistance > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {Object.entries(activityStats.by_sport_type).map(([sportTypeIdStr, sportData]) => {
                const sportTypeId = Number(sportTypeIdStr);
                const sportType = sportTypes.find(s => s.id === sportTypeId);
                const sportName = sportType?.name ?? t('sports.other');
                const sportSlug = sportType?.slug ?? 'other';
                const sportIcon = sportType?.icon ?? null;
                const barColor = getSportColor(sportSlug);
                const percentage = (sportData.distance / totalSportDistance) * 100;
                const distanceKm = (sportData.distance / 1000).toFixed(1);

                return (
                  <View key={sportTypeIdStr} style={styles.breakdownItem}>
                    <View style={styles.breakdownHeader}>
                      <View style={styles.breakdownLabelRow}>
                        {sportIcon && (
                          <Ionicons
                            name={sportIcon as keyof typeof Ionicons.glyphMap}
                            size={14}
                            color={colors.textSecondary}
                          />
                        )}
                        <Text style={[styles.breakdownSportName, { color: colors.textSecondary }]}>
                          {sportName}
                        </Text>
                      </View>
                      <Text style={[styles.breakdownDistance, { color: colors.textPrimary }]}>
                        {distanceKm} km
                      </Text>
                    </View>
                    <View style={[styles.breakdownBarTrack, { backgroundColor: colors.border + '40' }]}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            backgroundColor: barColor,
                            width: `${Math.max(percentage, 2)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Expandable Comparison Section */}
          <View style={[
            styles.compareCard,
            {
              backgroundColor: colors.cardBackground,
              borderColor: compareUser ? colors.primary : colors.border,
            },
          ]}>
            {/* Toggle Header */}
            <TouchableOpacity
              style={styles.compareHeader}
              onPress={() => setCompareOpen(!compareOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.compareHeaderLeft}>
                <Text style={styles.compareEmoji}>&#x2694;&#xFE0F;</Text>
                <Text style={[styles.compareTitle, { color: colors.textPrimary }]}>
                  {t('profile.stats.compareWith')}
                </Text>
              </View>
              <View style={styles.compareHeaderRight}>
                {/* Active comparison indicator (visible when collapsed) */}
                {compareUser && !compareOpen && (
                  <View style={styles.compareActiveIndicator}>
                    <Avatar uri={compareUser.avatar} name={compareUser.name} size="sm" />
                    <Text
                      style={[styles.compareActiveName, { color: colors.primary }]}
                      numberOfLines={1}
                    >
                      {compareUser.name}
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={compareOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={compareUser ? colors.primary : colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {compareOpen && (
              <View style={styles.compareBody}>
                {/* User selector row */}
                <CompareUserSelector
                  following={following}
                  selectedUser={compareUser}
                  onSelectUser={setCompareUser}
                  isLoading={isLoadingFollowing}
                />

                {/* Comparison bars - only when both user and stats are available */}
                {compareUser && activityStats?.by_sport_type && (
                  <View style={styles.compareBarsContainer}>
                    {/* Legend */}
                    <View style={styles.compareLegend}>
                      <View style={styles.compareLegendItem}>
                        <View style={[styles.compareLegendDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.compareLegendText, { color: colors.textSecondary }]}>
                          {t('profile.stats.you')}
                        </Text>
                      </View>
                      <View style={styles.compareLegendItem}>
                        <View style={[styles.compareLegendDot, { backgroundColor: '#F87171' }]} />
                        <Text style={[styles.compareLegendText, { color: colors.textSecondary }]}>
                          {compareUser.name}
                        </Text>
                      </View>
                    </View>

                    {isLoadingCompareStats ? (
                      <View style={styles.compareLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    ) : (
                      <>
                        {Object.entries(activityStats.by_sport_type).map(([sportTypeIdStr, myData]) => {
                          const sportTypeId = Number(sportTypeIdStr);
                          const sportType = sportTypes.find(s => s.id === sportTypeId);
                          const sportName = sportType?.name ?? t('sports.other');
                          const sportIcon = sportType?.icon ?? null;
                          const theirData = compareStats?.by_sport_type?.[sportTypeId];
                          const myDistKm = myData.distance / 1000;
                          const theirDistKm = (theirData?.distance ?? 0) / 1000;
                          const maxDist = Math.max(myDistKm, theirDistKm, 0.1);
                          const myPct = (myDistKm / maxDist) * 100;
                          const theirPct = (theirDistKm / maxDist) * 100;

                          return (
                            <View key={sportTypeIdStr} style={styles.compareBarItem}>
                              <View style={styles.compareBarHeader}>
                                <View style={styles.compareBarLabelRow}>
                                  {sportIcon && (
                                    <Ionicons
                                      name={sportIcon as keyof typeof Ionicons.glyphMap}
                                      size={14}
                                      color={colors.textPrimary}
                                    />
                                  )}
                                  <Text style={[styles.compareBarLabel, { color: colors.textPrimary }]}>
                                    {sportName}
                                  </Text>
                                </View>
                                <Text style={[styles.compareBarValues, { color: colors.textSecondary }]}>
                                  {myDistKm.toFixed(1)} vs {theirDistKm.toFixed(1)} km
                                </Text>
                              </View>
                              <View style={[styles.compareBarTrack, { backgroundColor: colors.border + '40' }]}>
                                {/* My bar (top half) */}
                                <View
                                  style={[
                                    styles.compareBarMine,
                                    {
                                      backgroundColor: colors.primary,
                                      width: `${Math.max(myPct, myDistKm > 0 ? 3 : 0)}%`,
                                    },
                                  ]}
                                />
                                {/* Their bar (bottom half) */}
                                <View
                                  style={[
                                    styles.compareBarTheirs,
                                    {
                                      backgroundColor: '#F87171',
                                      width: `${Math.max(theirPct, theirDistKm > 0 ? 3 : 0)}%`,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

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
    if (activeTab === 'drafts') return [];
    if (activeTab === 'stats') return [];
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
          onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
          showEngagement
        />
      );
    }
    return (
      <EventCard
        event={item as Event}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
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
          contentPaddingBottom={tabBarPaddingBottom}
          onPublishSuccess={() => {
            postsData.refresh();
            fetchDraftsCount();
            setActiveTab('posts');
          }}
          onDeleteSuccess={() => {
            fetchDraftsCount();
          }}
          onEditDraft={(draft) => {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
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
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerTabSpacer: {
    height: spacing.md,
  },
  tabSpacer: {
    height: spacing.md,
  },

  // Cover Image
  coverImage: {
    height: 120,
    position: 'relative',
    marginHorizontal: -spacing.md,
  },
  coverSettingsButton: {
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

  // Profile Header
  profileHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    marginHorizontal: -spacing.md,
  },

  // Avatar + Info Row
  avatarInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
    marginTop: -40,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  infoColumn: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    lineHeight: fontSize.xl * 1.2,
  },
  username: {
    fontSize: fontSize.sm,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  compactStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  compactStatItem: {
    alignItems: 'center',
  },
  compactStatValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    lineHeight: fontSize.lg * 1.1,
  },
  compactStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Badges Row
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  badgeTextContainer: {
    flex: 1,
  },
  badgeValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 10,
  },

  // Training Card
  trainingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  trainingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainingContent: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  trainingSubtitle: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },

  // Quick Navigation Cards (Insights / Teams / Routes)
  quickNavRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickNavCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  quickNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Pill Tab Bar
  pillTabContainer: {
    flexDirection: 'row',
    marginHorizontal: -spacing.md,
    marginTop: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    gap: 2,
    borderRadius: borderRadius.xl,
    marginLeft: 0,
    marginRight: 0,
  },
  pillTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: borderRadius.lg,
    gap: 2,
  },
  pillTabActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillTabIconContainer: {
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
  pillTabEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  pillTabText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },

  // Emoji Sport Filter
  emojiFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  emojiFilterItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 4,
  },
  emojiFilterIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  emojiFilterLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Filter / Stats content
  filterContent: {
    marginTop: spacing.sm,
  },
  statsTabContent: {
    marginTop: spacing.sm,
  },

  // Summary Cards
  summaryCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  summaryValueSmall: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Breakdown Bars
  breakdownCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  breakdownItem: {
    marginBottom: spacing.md,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownSportName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  breakdownDistance: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  breakdownBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Comparison Section
  compareCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  compareHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  compareActiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 140,
  },
  compareActiveName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    flexShrink: 1,
  },
  compareEmoji: {
    fontSize: 18,
  },
  compareTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  compareBody: {
    marginTop: spacing.md,
  },
  compareBarsContainer: {
    marginTop: spacing.sm,
  },
  compareLegend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  compareLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  compareLegendText: {
    fontSize: fontSize.xs,
  },
  compareLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  compareBarItem: {
    marginBottom: spacing.md,
  },
  compareBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compareBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compareBarLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  compareBarValues: {
    fontSize: fontSize.xs,
  },
  compareBarTrack: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  compareBarMine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '50%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  compareBarTheirs: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: '50%',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },

  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
