import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useActivityStats } from '../../hooks/useActivityStats';
import { usePointStats } from '../../hooks/usePointStats';
import { useSportTypes } from '../../hooks/useSportTypes';
import { useFollowing } from '../../hooks/useFollowing';
import { api } from '../../services/api';
import { fixStorageUrl } from '../../config/api';
import { spacing, fontSize } from '../../theme';
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

export function ProfileScreen({ navigation, route }: Props & { navigation: ProfileScreenNavigationProp }) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'posts');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Update active tab when navigating with initialTab param
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Activity stats and points hooks
  const { stats: activityStats, isLoading: isLoadingActivityStats, refetch: refetchActivityStats } = useActivityStats();
  const { stats: pointStats, isLoading: isLoadingPointStats, refetch: refetchPointStats } = usePointStats();
  const { sportTypes } = useSportTypes();
  const { following, isLoading: isLoadingFollowing } = useFollowing();

  // Comparison state
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [compareStats, setCompareStats] = useState<ActivityStats | null>(null);
  const [isLoadingCompareStats, setIsLoadingCompareStats] = useState(false);

  // Fetch comparison user stats when selected
  useEffect(() => {
    const fetchCompareStats = async () => {
      if (!compareUser) {
        setCompareStats(null);
        return;
      }

      setIsLoadingCompareStats(true);
      try {
        const stats = await api.getUserActiveActivityStats(compareUser.id);
        setCompareStats(stats);
      } catch (error) {
        console.error('Failed to fetch compare user stats:', error);
        setCompareStats(null);
      } finally {
        setIsLoadingCompareStats(false);
      }
    };

    fetchCompareStats();
  }, [compareUser]);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Activities state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [isAuthenticated]);

  const fetchPosts = useCallback(async (page: number, refresh = false) => {
    if (!user || isLoadingPosts) return;

    setIsLoadingPosts(true);
    try {
      const response = await api.getPosts({ user_id: user.id, page });
      if (refresh) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
      setHasMorePosts(response.meta.current_page < response.meta.last_page);
      setPostsPage(page);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [user, isLoadingPosts]);

  const fetchActivities = useCallback(async (page: number, refresh = false) => {
    if (!user || isLoadingActivities) return;

    setIsLoadingActivities(true);
    try {
      const response = await api.getActivities({ user_id: user.id, page });
      if (refresh) {
        setActivities(response.data);
      } else {
        setActivities(prev => [...prev, ...response.data]);
      }
      setHasMoreActivities(response.meta.current_page < response.meta.last_page);
      setActivitiesPage(page);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [user, isLoadingActivities]);

  const fetchEvents = useCallback(async (page: number, refresh = false) => {
    if (!user || isLoadingEvents) return;

    setIsLoadingEvents(true);
    try {
      const response = await api.getEvents({ user_id: user.id, page });
      if (refresh) {
        setEvents(response.data);
      } else {
        setEvents(prev => [...prev, ...response.data]);
      }
      setHasMoreEvents(response.meta.current_page < response.meta.last_page);
      setEventsPage(page);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user, isLoadingEvents]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      setPosts([]);
      setActivities([]);
      setEvents([]);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchStats();
        // Load initial data for current tab
        if (activeTab === 'posts' && posts.length === 0) {
          fetchPosts(1, true);
        } else if (activeTab === 'activities' && activities.length === 0) {
          fetchActivities(1, true);
        } else if (activeTab === 'events' && events.length === 0) {
          fetchEvents(1, true);
        }
      }
    }, [isAuthenticated, activeTab])
  );

  // Load data when tab changes
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts(1, true);
    } else if (activeTab === 'activities' && activities.length === 0) {
      fetchActivities(1, true);
    } else if (activeTab === 'events' && events.length === 0) {
      fetchEvents(1, true);
    }
  }, [activeTab, isAuthenticated]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();

    if (activeTab === 'posts') {
      setPostsPage(1);
      setHasMorePosts(true);
      await fetchPosts(1, true);
    } else if (activeTab === 'stats') {
      await Promise.all([
        refetchActivityStats(),
        refetchPointStats(),
      ]);
    } else if (activeTab === 'activities') {
      setActivitiesPage(1);
      setHasMoreActivities(true);
      await fetchActivities(1, true);
    } else if (activeTab === 'events') {
      setEventsPage(1);
      setHasMoreEvents(true);
      await fetchEvents(1, true);
    }

    setIsRefreshing(false);
  };

  const handleLoadMorePosts = () => {
    if (hasMorePosts && !isLoadingPosts) {
      fetchPosts(postsPage + 1);
    }
  };

  const handleLoadMoreActivities = () => {
    if (hasMoreActivities && !isLoadingActivities) {
      fetchActivities(activitiesPage + 1);
    }
  };

  const handleLoadMoreEvents = () => {
    if (hasMoreEvents && !isLoadingEvents) {
      fetchEvents(eventsPage + 1);
    }
  };

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
    setShowFollowersModal(true);
  };

  const handleFollowingPress = () => {
    setShowFollowingModal(true);
  };

  const handleUserNavigation = (selectedUser: User) => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
    navigation.navigate('UserProfile', { username: selectedUser.username });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
      </SafeAreaView>
    );
  }

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'newspaper-outline' },
    { label: t('profile.tabs.drafts'), value: 'drafts', icon: 'document-outline' },
    { label: t('profile.tabs.stats'), value: 'stats', icon: 'stats-chart' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'fitness-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  const renderProfileHeader = () => (
    <>
      {user?.background_image_url ? (
        <ImageBackground
          source={{ uri: fixStorageUrl(user.background_image_url) || undefined }}
          style={[styles.coverImage, { backgroundColor: colors.primary }]}
          resizeMode="cover"
        >
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </ImageBackground>
      ) : (
        <View style={[styles.coverImage, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

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
          <PointsCard stats={pointStats} isLoading={isLoadingPointStats} />
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    const isLoading =
      (activeTab === 'posts' && isLoadingPosts) ||
      (activeTab === 'activities' && isLoadingActivities) ||
      (activeTab === 'events' && isLoadingEvents);

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
      (activeTab === 'posts' && isLoadingPosts && posts.length === 0) ||
      (activeTab === 'activities' && isLoadingActivities && activities.length === 0) ||
      (activeTab === 'events' && isLoadingEvents && events.length === 0);

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
    if (activeTab === 'posts') return posts;
    if (activeTab === 'drafts') return []; // Drafts content rendered separately
    if (activeTab === 'stats') return []; // Stats content rendered in header
    if (activeTab === 'activities') return activities;
    return events;
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
      // Update local state
      setPosts(prev => prev.map(p =>
        p.id === post.id
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ));
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
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
      handleLoadMorePosts();
    } else if (activeTab === 'activities') {
      handleLoadMoreActivities();
    } else if (activeTab === 'events') {
      handleLoadMoreEvents();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Keep DraftsTab mounted but hidden to prevent blinking on tab switch */}
      <View style={[styles.tabContent, activeTab !== 'drafts' && styles.hiddenTab]}>
        <DraftsTab
          isOwnProfile={true}
          ListHeaderComponent={renderProfileHeader}
          onPublishSuccess={() => {
            // Refresh posts tab after successful publish
            fetchPosts(1, true);
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
        <>
          <UserListModal
            visible={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
            title={t('profile.followersList.title')}
            userId={user.id}
            listType="followers"
            onUserPress={handleUserNavigation}
          />
          <UserListModal
            visible={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
            title={t('profile.followingList.title')}
            userId={user.id}
            listType="following"
            onUserPress={handleUserNavigation}
          />
        </>
      )}
    </SafeAreaView>
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
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statsTabContent: {
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
});
