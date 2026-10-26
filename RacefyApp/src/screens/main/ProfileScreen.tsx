import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityCard,
  BadgeSheet,
  DraftPostCard,
  EmptyState,
  EventCard,
  PostCard,
  ScreenContainer,
  SportTypeFilter,
  UserListModal,
} from '../../components';
import { useTabBarPadding } from '../../navigation/useTabBarPadding';
import { useAuth } from '../../hooks/useAuth';
import { useMarkSectionSeen, useNavBadges } from '../../hooks/useNavBadges';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../hooks/useTheme';
import { useActivityTrends } from '../../hooks/useActivityTrends';
import { usePointStats } from '../../hooks/usePointStats';
import { useRankDelta } from '../../hooks/useRankDelta';
import { useRewards } from '../../hooks/useRewards';
import { useSportTypes } from '../../hooks/useSportTypes';
import { useFollowing } from '../../hooks/useFollowing';
import { usePaginatedTabData } from '../../hooks/usePaginatedTabData';
import { useDrafts } from '../../hooks/useDrafts';
import { ProfileHeader, type ProfileScreenNavigationProp } from './profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabType } from './profile/ProfileTabBar';
import { ProfileStatsTab } from './profile/ProfileStatsTab';
import { useProfileStatsFilters } from './profile/useProfileStatsFilters';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';
import type {
  Activity,
  BadgeReward,
  DraftPost,
  Event,
  Post,
  User,
  UserStats,
} from '../../types/api';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

type TabType = ProfileTabType;

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

export function ProfileScreen({ navigation: tabNavigation, route }: Props) {
  // The screen reaches both the tab navigator and the root stack; the tab
  // navigator's own prop type only knows about the former.
  const navigation = tabNavigation as unknown as ProfileScreenNavigationProp;

  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { tier } = useSubscription();
  const tabBarPaddingBottom = useTabBarPadding();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'stats');
  // "New since last visit": own activities on their tab, admin replies to
  // feedback on the settings button (feedback lives under Settings).
  const navBadges = useNavBadges();
  const newActivities = navBadges?.sections.activities ?? 0;
  const newFeedback = navBadges?.sections.feedback ?? 0;
  useMarkSectionSeen('activities', activeTab === 'activities');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draftsCount, setDraftsCount] = useState(0);

  // Modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | 'requests'>(
    'followers',
  );
  const [pendingFollowCount, setPendingFollowCount] = useState(0);

  // Period / sport / metric filters and the stats computed from them; the sport
  // also filters the Activities tab.
  const filters = useProfileStatsFilters();
  const {
    selectedSportTypeId,
    setSelectedSportTypeId,
    activityStats,
    isLoadingActivityStats,
    refetchActivityStats,
  } = filters;

  // Update active tab when navigating with initialTab param
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const {
    stats: pointStats,
    isLoading: isLoadingPointStats,
    refetch: refetchPointStats,
  } = usePointStats();
  // The direction of travel next to the rank. Derived on the device — the API
  // has no "previous rank" — so it is absent on the first visit of a period.
  const rankDeltas = useRankDelta(pointStats);
  const { badges } = useRewards();
  const [openBadge, setOpenBadge] = useState<BadgeReward | null>(null);
  const { sportTypes } = useSportTypes();
  const {
    trends,
    granularity: trendGranularity,
    isLoading: isLoadingTrends,
  } = useActivityTrends(filters.selectedTimeRange, selectedSportTypeId);
  const { following, isLoading: isLoadingFollowing } = useFollowing();

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

  // Stable, so the memoized header is not re-rendered by a tab switch.
  const openEditProfile = useCallback(() => navigation.navigate('EditProfile'), [navigation]);
  const openSettings = useCallback(() => navigation.navigate('Settings'), [navigation]);
  const openLeaderboard = useCallback(() => navigation.navigate('Leaderboard'), [navigation]);
  const openRewards = useCallback(() => navigation.navigate('Rewards'), [navigation]);

  const handleFollowersPress = useCallback(() => {
    setFollowModalTab('followers');
    setShowFollowModal(true);
  }, []);

  const handleFollowingPress = useCallback(() => {
    setFollowModalTab('following');
    setShowFollowModal(true);
  }, []);

  const handleUserNavigation = (selectedUser: User) => {
    setShowFollowModal(false);
    navigation.navigate('UserProfile', { username: selectedUser.username });
  };

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

  // Whatever the active tab needs above its rows. Rendered as the first row so
  // it scrolls away under the sticky tab bar instead of being pinned with it.
  const renderTabExtras = () => (
    <>
      {/* Unpublished activities are easy to forget about, and forgetting costs
          points — so the drafts tab opens by saying how many there are and what
          publishing is worth (design "Racefy v2" → DraftsTab). */}
      {activeTab === 'drafts' && draftsCount > 0 && (
        <View style={[styles.draftsNote, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="create-outline" size={16} color={colors.warning} />
          <Text style={[styles.draftsNoteText, { color: colors.warning }]}>
            {t('drafts.unpublishedNote', { count: draftsCount })}
          </Text>
        </View>
      )}

      {activeTab === 'activities' && (
        <View style={[styles.activitiesFilterContent, styles.filterBleed]}>
          <SportTypeFilter
            sportTypes={sportTypes}
            selectedSportTypeId={selectedSportTypeId}
            onSelectSportType={setSelectedSportTypeId}
            isLoading={activitiesData.isLoading}
          />
        </View>
      )}

      {activeTab === 'stats' && (
        <ProfileStatsTab
          filters={filters}
          sportTypes={sportTypes}
          trends={trends}
          trendGranularity={trendGranularity}
          isLoadingTrends={isLoadingTrends}
          following={following}
          isLoadingFollowing={isLoadingFollowing}
          pointStats={pointStats}
          isLoadingPointStats={isLoadingPointStats}
          navigation={navigation}
        />
      )}
    </>
  );

  // Not authenticated: render the sign-in prompt. Placed AFTER all hooks above
  // so the Rules of Hooks hold.
  if (!isAuthenticated) {
    return (
      <ScreenContainer glow={false}>
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
    // Bez poświaty: sticky pasek tabów musi być nieprzezroczysty, a płaskie
    // `colors.background` nie odtworzy gradientu pod sobą — zostawał jaśniejszy
    // prostokąt. Design "Racefy v2" ma tu płaskie tło.
    <ScreenContainer glow={false}>
      {/* One list for every tab, drafts included. Two lists meant the profile
          header — cover, avatar and the whole navigation block — was mounted
          twice, so its data hooks fired twice on every visit. */}
      <SectionList
        ref={listRef}
        sections={[{ data: getData() }]}
        keyExtractor={getKeyExtractor}
        renderItem={renderItem}
        renderSectionHeader={() => (
          <ProfileTabBar
            activeTab={activeTab}
            onChange={setActiveTab}
            newActivities={newActivities}
            draftsCount={draftsCount}
          />
        )}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <ProfileHeader
            user={user}
            stats={stats}
            pointStats={pointStats}
            weeklyDelta={rankDeltas.weekly ?? null}
            badges={badges}
            tier={tier}
            pendingFollowCount={pendingFollowCount}
            newFeedback={newFeedback}
            navigation={navigation}
            onLayoutHeight={setHeaderHeight}
            onEditProfile={openEditProfile}
            onOpenSettings={openSettings}
            onOpenFollowers={handleFollowersPress}
            onOpenFollowing={handleFollowingPress}
            onOpenLeaderboard={openLeaderboard}
            onOpenRewards={openRewards}
            onOpenBadge={setOpenBadge}
          />
        }
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

      <BadgeSheet reward={openBadge} onClose={() => setOpenBadge(null)} />
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  draftsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  draftsNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  activitiesFilterContent: {
    // Bez marginTop: odstęp 12 pod kreską daje już `stickyTabs.paddingBottom`.
    marginBottom: spacing.md,
  },
  // Filtr sportów scrolluje od krawędzi ekranu — własny padding listy chipów
  // ustawia je w jednej linii z kartami, zamiast dokładać drugie wcięcie.
  filterBleed: {
    marginHorizontal: -spacing.lg,
  },
});
