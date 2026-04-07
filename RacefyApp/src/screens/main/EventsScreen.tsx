import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventCard, LiveEventCard, Loading, EmptyState, RewardCard, ScreenContainer, AnimatedListItem, Card } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import type { Event, EventWithLatestCommentary, EventStats, EventOverview, Reward, RewardType } from '../../types/api';

const LIVE_VIEW_MODE_KEY = '@racefy_events_live_view_mode';
type LiveViewMode = 'compact' | 'detailed';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Events'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterOption = 'all' | 'upcoming' | 'ongoing' | 'completed';
type TabOption = 'events' | 'rewards';
type RewardFilterOption = 'all' | 'points' | 'coupon' | 'badge' | 'prize';

export function EventsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = 60 + insets.bottom + spacing.md;
  const { isAuthenticated } = useAuth();
  const {
    events,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    statusFilter,
    refresh,
    loadMore,
    changeFilter,
  } = useEvents();

  const filters: { label: string; value: FilterOption }[] = [
    { label: t('events.filters.all'), value: 'all' },
    { label: t('events.filters.upcoming'), value: 'upcoming' },
    { label: t('events.filters.ongoing'), value: 'ongoing' },
    { label: t('events.filters.completed'), value: 'completed' },
  ];

  const [activeFilter, setActiveFilter] = useState<FilterOption>(route.params?.initialFilter || 'all');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabOption>('events');

  // Rewards state
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsRefreshing, setRewardsRefreshing] = useState(false);
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('all');
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [totalBadges, setTotalBadges] = useState(0);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Overview stats & preview events
  const [ongoingEvents, setOngoingEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [liveEventsDetailed, setLiveEventsDetailed] = useState<EventWithLatestCommentary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [eventOverview, setEventOverview] = useState<EventOverview | null>(null);

  // Live view mode (compact = default, detailed = with cover + AI commentary)
  const [liveViewMode, setLiveViewMode] = useState<LiveViewMode>('compact');

  useEffect(() => {
    AsyncStorage.getItem(LIVE_VIEW_MODE_KEY).then((val) => {
      if (val === 'compact' || val === 'detailed') {
        setLiveViewMode(val);
      }
    });
  }, []);

  const toggleLiveViewMode = useCallback(() => {
    const newMode: LiveViewMode = liveViewMode === 'compact' ? 'detailed' : 'compact';
    setLiveViewMode(newMode);
    AsyncStorage.setItem(LIVE_VIEW_MODE_KEY, newMode);
  }, [liveViewMode]);

  const fetchOverviewData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [ongoingRes, upcomingRes, completedRes, overview, stats] = await Promise.all([
        api.getEvents({ status: 'ongoing', per_page: 3 }),
        api.getEvents({ status: 'upcoming', per_page: 3 }),
        api.getEvents({ status: 'completed', per_page: 3 }),
        api.getEventOverview(),
        isAuthenticated ? api.getEventStats() : Promise.resolve(null),
      ]);

      setOngoingEvents(ongoingRes.data);
      setUpcomingEvents(upcomingRes.data);
      setCompletedEvents(completedRes.data);
      setEventOverview(overview);
      setEventStats(stats);

      // Fetch detailed live events (with commentary) for detailed mode
      if (ongoingRes.data.length > 0) {
        try {
          const homeData = await api.getHome({ include_activities: false, include_upcoming: false });
          setLiveEventsDetailed(homeData.live_events || []);
        } catch {
          setLiveEventsDetailed(ongoingRes.data as EventWithLatestCommentary[]);
        }
      } else {
        setLiveEventsDetailed([]);
      }
    } catch (err) {
      logger.debug('api', 'Failed to fetch overview data', { error: err });
    } finally {
      setStatsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshAll = useCallback(() => {
    refresh();
    fetchOverviewData();
  }, [refresh, fetchOverviewData]);

  useRefreshOn('events', refreshAll);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    changeFilter(activeFilter === 'all' ? undefined : activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (statusFilter !== undefined || activeFilter === 'all') {
      refresh();
    }
  }, [statusFilter]);

  // Animate search visibility
  useEffect(() => {
    Animated.timing(searchAnimValue, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      if (isSearchVisible) {
        searchInputRef.current?.focus();
      }
    });
  }, [isSearchVisible]);

  // Handle search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.search({ query, type: 'events', per_type: 20 });
      setSearchResults(response.results.events.data);
    } catch (error) {
      logger.error('api', 'Search error', { error });
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (text.length >= 2) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(() => {
        performSearch(text);
      }, 300);
    } else {
      setSearchResults(null);
      setIsSearching(false);
    }
  }, [performSearch]);

  const toggleSearch = useCallback(() => {
    if (isSearchVisible) {
      setSearchQuery('');
      setSearchResults(null);
      Keyboard.dismiss();
    }
    setIsSearchVisible(!isSearchVisible);
  }, [isSearchVisible]);

  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventDetail', { eventId });
  };

  // Load rewards from API
  const loadRewards = useCallback(async (isRefreshing = false) => {
    if (!isAuthenticated) return;

    if (isRefreshing) {
      setRewardsRefreshing(true);
    } else {
      setRewardsLoading(true);
    }

    setRewardsError(null);

    try {
      const filters = rewardFilter !== 'all' ? { type: rewardFilter } : undefined;
      logger.info('api', 'Loading rewards', { filters, rewardFilter });

      const response = await api.getUserRewards(filters);

      logger.info('api', 'Rewards loaded', {
        count: response.data.length,
        total_points: response.total_points,
        filter: rewardFilter,
        types: response.data.map(r => r.reward_type)
      });

      setRewards(response.data);
      setTotalPoints(response.total_points);
      setTotalCoupons(response.total_coupons);
      setTotalBadges(response.total_badges);
    } catch (error) {
      logger.error('api', 'Failed to load rewards', { error });
      setRewardsError('Failed to load rewards');
    } finally {
      setRewardsLoading(false);
      setRewardsRefreshing(false);
    }
  }, [isAuthenticated, rewardFilter]);

  // Load rewards when switching to rewards tab or when filter changes
  useEffect(() => {
    if (activeTab === 'rewards') {
      loadRewards();
    }
  }, [activeTab, rewardFilter, loadRewards]);

  const renderTabs = () => {
    return (
      <View style={[styles.tabsContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'events' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'events' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'events' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {t('rewards.tabs.events')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'rewards' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('rewards')}
        >
          <Ionicons
            name="gift-outline"
            size={20}
            color={activeTab === 'rewards' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'rewards' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {t('rewards.tabs.rewards')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchBar = () => {
    if (!isSearchVisible) return null;

    const searchBarHeight = searchAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 56],
    });

    return (
      <Animated.View style={{ height: searchBarHeight, overflow: 'hidden' }}>
        <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('search.placeholderEvents')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderRewardsTab = () => {
    if (rewardsLoading && rewards.length === 0) {
      return (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    const rewardFilters: { label: string; value: RewardFilterOption }[] = [
      { label: t('rewards.filters.all'), value: 'all' },
      { label: t('rewards.filters.points'), value: 'points' },
      { label: t('rewards.filters.coupons'), value: 'coupon' },
      { label: t('rewards.filters.badges'), value: 'badge' },
      { label: t('rewards.filters.prizes'), value: 'prize' },
    ];

    // Calculate filtered stats
    const filteredPointsSum = rewards
      .filter(r => r.reward_type === 'points')
      .reduce((sum, r) => sum + (r as any).points, 0);

    const filteredCouponsCount = rewards.filter(r => r.reward_type === 'coupon').length;
    const filteredBadgesCount = rewards.filter(r => r.reward_type === 'badge').length;

    // Show filtered or total stats
    const displayPoints = rewardFilter === 'points' ? filteredPointsSum : totalPoints;
    const displayCoupons = rewardFilter === 'coupon' ? filteredCouponsCount : totalCoupons;
    const displayBadges = rewardFilter === 'badge' ? filteredBadgesCount : totalBadges;

    return (
      <>
        {/* Stats Summary - Only show when filter is 'all' */}
        {rewardFilter === 'all' && (
          <View style={[styles.statsContainer, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayPoints}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('rewards.stats.totalPoints')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="ticket" size={20} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayCoupons}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('rewards.stats.totalCoupons')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="medal" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{displayBadges}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('rewards.stats.totalBadges')}
              </Text>
            </View>
          </View>
        )}

        {/* Reward Filters */}
        <View style={[styles.filterContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          {rewardFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                { backgroundColor: colors.borderLight },
                rewardFilter === filter.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => setRewardFilter(filter.value)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.textSecondary },
                  rewardFilter === filter.value && { color: colors.white },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results count */}
        {!rewardsLoading && rewards.length > 0 && (
          <View style={styles.resultsCount}>
            <Text style={[styles.resultsCountText, { color: colors.textMuted }]}>
              {rewards.length} {rewards.length === 1 ? t('rewards.reward') : t('rewards.rewards')}
              {rewardFilter !== 'all' && ` • ${t('rewards.stats.totalPoints')}: ${totalPoints}`}
            </Text>
          </View>
        )}

        {/* Rewards List */}
        <FlatList
          data={rewards}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <RewardCard
              reward={item}
              onPress={() => {
                if ('event_id' in item && item.event_id) {
                  navigation.navigate('EventDetail', { eventId: item.event_id });
                }
              }}
            />
          )}
          ListEmptyComponent={
            rewardsError ? (
              <EmptyState
                icon="alert-circle-outline"
                title={t('rewards.failedToLoad')}
                message={rewardsError}
                actionLabel={t('common.tryAgain')}
                onAction={() => loadRewards()}
              />
            ) : (
              <EmptyState
                icon="gift-outline"
                title={t('rewards.noRewards')}
                message={t('rewards.noRewardsMessage')}
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={rewardsRefreshing}
              onRefresh={() => loadRewards(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
        />
      </>
    );
  };

   const getDifficultyColor = (difficulty: Event['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.primary;
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${meters} m`;
  };

  type StatItem = { icon: keyof typeof Ionicons.glyphMap; color: string; value: number | string; label: string };

  const getStatsForFilter = (filter: FilterOption): StatItem[] => {
    const s = eventStats;
    const o = eventOverview;

    switch (filter) {
      case 'all':
        // General tab: personal overview
        return [
          { icon: 'checkbox', color: colors.success, value: s?.participated.joined ?? 0, label: t('events.stats.joined') },
          { icon: 'trophy', color: colors.warning, value: s?.results.podiums ?? 0, label: t('events.stats.podiums') },
          { icon: 'radio', color: colors.error, value: s?.participated.ongoing ?? o?.ongoing.event_count ?? 0, label: t('events.stats.ongoing') },
          { icon: 'time', color: colors.primary, value: s?.participated.upcoming ?? o?.upcoming.event_count ?? 0, label: t('events.stats.upcoming') },
        ];
      case 'ongoing':
        return [
          { icon: 'radio', color: colors.error, value: o?.ongoing.event_count ?? 0, label: t('events.stats.ongoing') },
          { icon: 'people', color: colors.info || '#3b82f6', value: o?.ongoing.total_participants ?? 0, label: t('events.stats.participants') },
          { icon: 'flag', color: colors.success, value: s?.participated.ongoing ?? 0, label: t('events.stats.joined') },
        ];
      case 'upcoming':
        return [
          { icon: 'time', color: colors.warning, value: o?.upcoming.event_count ?? 0, label: t('events.stats.upcoming') },
          { icon: 'people', color: colors.info || '#3b82f6', value: o?.upcoming.total_participants ?? 0, label: t('events.stats.participants') },
          { icon: 'checkbox', color: colors.success, value: s?.participated.upcoming ?? 0, label: t('events.stats.joined') },
        ];
      case 'completed':
        return [
          { icon: 'checkmark-done', color: colors.primary, value: s?.participated.completed ?? 0, label: t('events.stats.myCompleted') },
          { icon: 'trophy', color: colors.warning, value: s?.results.podiums ?? 0, label: t('events.stats.podiums') },
          { icon: 'navigate', color: colors.success, value: s ? formatDistance(s.activity_totals.distance) : '0', label: t('events.stats.distance') },
          { icon: 'ribbon', color: colors.error, value: s?.results.total_finishes ?? 0, label: t('events.stats.finishes') },
        ];
    }
  };

  const renderStats = () => {
    const stats = getStatsForFilter(activeFilter);
    return (
      <View style={[styles.overviewStatsRow, { backgroundColor: colors.cardBackground }]}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.label}>
            {index > 0 && <View style={[styles.overviewStatDivider, { backgroundColor: colors.border }]} />}
            <View style={styles.overviewStatItem}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
              <Text style={[styles.overviewStatValue, { color: colors.textPrimary }]}>
                {statsLoading ? '—' : stat.value}
              </Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderEventsOverview = () => {
    return (
      <View style={styles.overviewContainer}>

        {/* Ongoing Events Section */}
        {ongoingEvents.length > 0 && (
          <View style={styles.overviewSection}>
            <View style={styles.overviewSectionHeader}>
              <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
                {t('events.happeningNow')}
              </Text>
              <View style={styles.overviewSectionActions}>
                <TouchableOpacity
                  style={[styles.viewModeToggle, { backgroundColor: colors.borderLight }]}
                  onPress={toggleLiveViewMode}
                >
                  <Ionicons
                    name={liveViewMode === 'compact' ? 'expand-outline' : 'contract-outline'}
                    size={16}
                    color={liveViewMode === 'detailed' ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
                {(eventOverview?.ongoing.event_count ?? 0) > 3 && (
                  <TouchableOpacity onPress={() => setActiveFilter('ongoing')}>
                    <Text style={[styles.overviewViewAll, { color: colors.primary }]}>{t('common.viewAll')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {liveViewMode === 'detailed' ? (
              // Detailed view with cover image + AI commentary (like Home screen)
              liveEventsDetailed.map((event) => (
                <LiveEventCard
                  key={event.id}
                  event={event}
                  onPress={() => handleEventPress(event.id)}
                  onBoostComplete={() => fetchOverviewData()}
                />
              ))
            ) : (
              // Compact view (default)
              ongoingEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => handleEventPress(event.id)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.overviewEventCard}>
                    <View style={[styles.overviewLiveBadge, { backgroundColor: colors.error }]}>
                      <Ionicons name="radio" size={18} color={colors.white} />
                      <Text style={[styles.overviewLiveText, { color: colors.white }]}>
                        {t('home.live')}
                      </Text>
                    </View>
                    <View style={styles.overviewEventContent}>
                      <Text style={[styles.overviewEventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {event.post?.title || t('eventDetail.untitled')}
                      </Text>
                      <View style={styles.overviewEventMeta}>
                        <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]}>
                          {event.participants_count}
                        </Text>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                        <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                          {event.location_name}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Upcoming Events Section */}
        {upcomingEvents.length > 0 && (
          <View style={styles.overviewSection}>
            <View style={styles.overviewSectionHeader}>
              <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
                {t('events.upcomingEvents')}
              </Text>
              {(eventOverview?.upcoming.event_count ?? 0) > 3 && (
                <TouchableOpacity onPress={() => setActiveFilter('upcoming')}>
                  <Text style={[styles.overviewViewAll, { color: colors.primary }]}>{t('common.viewAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.8}
              >
                <Card style={styles.overviewEventCard}>
                  <View style={[styles.overviewDateBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.overviewDateDay, { color: colors.white }]}>
                      {format(new Date(event.starts_at), 'd')}
                    </Text>
                    <Text style={[styles.overviewDateMonth, { color: colors.white }]}>
                      {format(new Date(event.starts_at), 'MMM')}
                    </Text>
                  </View>
                  <View style={styles.overviewEventContent}>
                    <Text style={[styles.overviewEventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {event.post?.title || t('eventDetail.untitled')}
                    </Text>
                    <View style={styles.overviewEventMeta}>
                      <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]}>
                        {event.participants_count}
                      </Text>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                      <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Completed Events Section */}
        {completedEvents.length > 0 && (
          <View style={styles.overviewSection}>
            <View style={styles.overviewSectionHeader}>
              <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
                {t('events.completedEvents')}
              </Text>
              {(eventOverview?.completed.event_count ?? 0) > 3 && (
                <TouchableOpacity onPress={() => setActiveFilter('completed')}>
                  <Text style={[styles.overviewViewAll, { color: colors.primary }]}>{t('common.viewAll')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {completedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.8}
              >
                <Card style={styles.overviewEventCard}>
                  <View style={[styles.overviewDateBadge, { backgroundColor: colors.textMuted }]}>
                    <Ionicons name="checkmark" size={22} color={colors.white} />
                  </View>
                  <View style={styles.overviewEventContent}>
                    <Text style={[styles.overviewEventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {event.post?.title || t('eventDetail.untitled')}
                    </Text>
                    <View style={styles.overviewEventMeta}>
                      <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]}>
                        {event.participants_count}
                      </Text>
                      <Ionicons name="location-outline" size={14} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                      <Text style={[styles.overviewEventMetaText, { color: colors.textMuted }]} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSearchResults = () => {
    if (!isSearchVisible || searchQuery.length === 0) return null;

    if (searchQuery.length < 2) {
      return (
        <View style={styles.searchResultsContainer}>
          <Text style={[styles.searchHint, { color: colors.textMuted }]}>
            {t('search.minChars')}
          </Text>
        </View>
      );
    }

    if (isSearching) {
      return (
        <View style={styles.searchResultsContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.searchingText, { color: colors.textMuted }]}>
            {t('search.searching')}
          </Text>
        </View>
      );
    }

    if (!searchResults || searchResults.length === 0) {
      return (
        <View style={styles.searchResultsContainer}>
          <EmptyState
            icon="search-outline"
            title={t('search.noResults')}
            message={t('search.noResultsFor', { query: searchQuery })}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => `search-${item.id}`}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => {
              setIsSearchVisible(false);
              setSearchQuery('');
              setSearchResults(null);
              handleEventPress(item.id);
            }}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {activeTab === 'rewards' ? t('rewards.title') : t('events.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {activeTab === 'rewards' ? t('rewards.subtitle') : t('events.subtitle')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleSearch}
          >
            <Ionicons
              name={isSearchVisible ? 'close' : 'search'}
              size={24}
              color={isSearchVisible ? colors.error : colors.textPrimary}
            />
          </TouchableOpacity>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('EventForm', {})}
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderTabs()}
      {renderSearchBar()}

      {isSearchVisible && searchQuery.length > 0 ? (
        renderSearchResults()
      ) : activeTab === 'rewards' ? (
        renderRewardsTab()
      ) : (
        <>
          <View style={[styles.filterContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  { backgroundColor: colors.borderLight },
                  activeFilter === filter.value && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    activeFilter === filter.value && { color: colors.white },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeFilter === 'all' ? (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refreshAll}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              {renderStats()}
              {renderEventsOverview()}
            </ScrollView>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <AnimatedListItem index={index}>
                  <EventCard event={item} onPress={() => handleEventPress(item.id)} />
                </AnimatedListItem>
              )}
              ListHeaderComponent={() => renderStats()}
              ListEmptyComponent={
                isLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : error ? (
                  <EmptyState
                    icon="alert-circle-outline"
                    title={t('events.failedToLoad')}
                    message={error}
                    actionLabel={t('common.tryAgain')}
                    onAction={refresh}
                  />
                ) : (
                  <EmptyState
                    icon="calendar-outline"
                    title={t('events.noEvents')}
                    message={t('events.noEventsFiltered', { filter: filters.find(f => f.value === activeFilter)?.label })}
                    actionLabel={isAuthenticated ? t('events.createEvent') : undefined}
                    onAction={
                      isAuthenticated
                        ? () => navigation.navigate('EventForm', {})
                        : undefined
                    }
                  />
                )
              }
              ListFooterComponent={
                isLoading && events.length > 0 ? (
                  <Loading message={t('common.loadingMore')} />
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refreshAll}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
            />
          )}
        </>
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  // Tabs styles
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  // Stats styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  // Search styles
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    height: '100%',
  },
  searchResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  searchHint: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  searchingText: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
  // Filter and list styles
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultsCountText: {
    fontSize: fontSize.sm,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  inlineLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  // Overview styles
  overviewContainer: {
    marginBottom: spacing.md,
  },
  overviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  overviewStatItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  overviewStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  overviewStatLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  overviewStatDivider: {
    width: 1,
    height: 40,
  },
  overviewSection: {
    marginBottom: spacing.md,
  },
  overviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overviewSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewModeToggle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  overviewViewAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  overviewEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overviewLiveBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  overviewLiveText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  overviewDateBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  overviewDateDay: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  overviewDateMonth: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  overviewEventContent: {
    flex: 1,
  },
  overviewEventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  overviewEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewEventMetaText: {
    fontSize: fontSize.sm,
    marginLeft: 4,
  },
});
