import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Button,
  EmptyState,
  PostCard,
  ActivityCard,
  EventCard,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { colors, spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { UserProfile, Post, Activity, Event } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

type TabType = 'posts' | 'activities' | 'events';

export function UserProfileScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { t } = useTranslation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [error, setError] = useState<string | null>(null);

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

  const isOwnProfile = currentUser?.username === username;

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getUserByUsername(username);
      setProfile(data);
      setIsFollowing(data.is_following ?? false);
      return data;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError(t('profile.failedToLoad'));
      return null;
    }
  }, [username, t]);

  const fetchPosts = useCallback(async (userId: number, page: number, refresh = false) => {
    if (isLoadingPosts) return;

    setIsLoadingPosts(true);
    try {
      const response = await api.getPosts({ user_id: userId, page });
      if (refresh) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
      setHasMorePosts(response.meta.current_page < response.meta.last_page);
      setPostsPage(page);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [isLoadingPosts]);

  const fetchActivities = useCallback(async (userId: number, page: number, refresh = false) => {
    if (isLoadingActivities) return;

    setIsLoadingActivities(true);
    try {
      const response = await api.getActivities({ user_id: userId, page });
      if (refresh) {
        setActivities(response.data);
      } else {
        setActivities(prev => [...prev, ...response.data]);
      }
      setHasMoreActivities(response.meta.current_page < response.meta.last_page);
      setActivitiesPage(page);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [isLoadingActivities]);

  const fetchEvents = useCallback(async (userId: number, page: number, refresh = false) => {
    if (isLoadingEvents) return;

    setIsLoadingEvents(true);
    try {
      const response = await api.getEvents({ user_id: userId, page });
      if (refresh) {
        setEvents(response.data);
      } else {
        setEvents(prev => [...prev, ...response.data]);
      }
      setHasMoreEvents(response.meta.current_page < response.meta.last_page);
      setEventsPage(page);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [isLoadingEvents]);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const profileData = await fetchProfile();
      if (profileData) {
        // Load initial posts
        await fetchPosts(profileData.id, 1, true);
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [username]);

  // Load data when tab changes
  useEffect(() => {
    if (!profile) return;

    if (activeTab === 'posts' && posts.length === 0) {
      fetchPosts(profile.id, 1, true);
    } else if (activeTab === 'activities' && activities.length === 0) {
      fetchActivities(profile.id, 1, true);
    } else if (activeTab === 'events' && events.length === 0) {
      fetchEvents(profile.id, 1, true);
    }
  }, [activeTab, profile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const profileData = await fetchProfile();

    if (profileData) {
      if (activeTab === 'posts') {
        setPostsPage(1);
        setHasMorePosts(true);
        await fetchPosts(profileData.id, 1, true);
      } else if (activeTab === 'activities') {
        setActivitiesPage(1);
        setHasMoreActivities(true);
        await fetchActivities(profileData.id, 1, true);
      } else if (activeTab === 'events') {
        setEventsPage(1);
        setHasMoreEvents(true);
        await fetchEvents(profileData.id, 1, true);
      }
    }

    setIsRefreshing(false);
  };

  const handleLoadMorePosts = () => {
    if (hasMorePosts && !isLoadingPosts && profile) {
      fetchPosts(profile.id, postsPage + 1);
    }
  };

  const handleLoadMoreActivities = () => {
    if (hasMoreActivities && !isLoadingActivities && profile) {
      fetchActivities(profile.id, activitiesPage + 1);
    }
  };

  const handleLoadMoreEvents = () => {
    if (hasMoreEvents && !isLoadingEvents && profile) {
      fetchEvents(profile.id, eventsPage + 1);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || !isAuthenticated) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(profile.id);
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count - 1 } : prev
        );
      } else {
        await api.followUser(profile.id);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev
        );
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const tabs: { label: string; value: TabType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: t('profile.tabs.posts'), value: 'posts', icon: 'newspaper-outline' },
    { label: t('profile.tabs.activities'), value: 'activities', icon: 'fitness-outline' },
    { label: t('profile.tabs.events'), value: 'events', icon: 'calendar-outline' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title={t('profile.userNotFound')}
          message={error || t('profile.userNotFoundMessage')}
          actionLabel={t('common.goBack')}
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const renderProfileHeader = () => (
    <>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.coverImage} />

      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Avatar uri={profile.avatar} name={profile.name} size="xxl" />
        </View>

        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{profile.posts_count}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.posts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{profile.followers_count}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.followers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>{profile.following_count}</Text>
            <Text style={styles.statLabel}>{t('profile.stats.following')}</Text>
          </TouchableOpacity>
        </View>

        {!isOwnProfile && isAuthenticated && (
          <View style={styles.actions}>
            <Button
              title={isFollowing ? t('profile.unfollow') : t('profile.follow')}
              onPress={handleFollowToggle}
              variant={isFollowing ? 'outline' : 'primary'}
              loading={isFollowLoading}
              style={styles.followButton}
            />
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && styles.tabActive]}
            onPress={() => setActiveTab(tab.value)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.value ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderFooter = () => {
    const isLoadingData =
      (activeTab === 'posts' && isLoadingPosts) ||
      (activeTab === 'activities' && isLoadingActivities) ||
      (activeTab === 'events' && isLoadingEvents);

    if (!isLoadingData) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    const isLoadingData =
      (activeTab === 'posts' && isLoadingPosts && posts.length === 0) ||
      (activeTab === 'activities' && isLoadingActivities && activities.length === 0) ||
      (activeTab === 'events' && isLoadingEvents && events.length === 0);

    if (isLoadingData) return null;

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
    if (activeTab === 'activities') return activities;
    return events;
  };

  const getKeyExtractor = (item: Post | Activity | Event) => {
    return `${activeTab}-${item.id}`;
  };

  const renderItem = ({ item }: { item: Post | Activity | Event }) => {
    if (activeTab === 'posts') {
      return (
        <PostCard
          post={item as Post}
          onUserPress={() => {}}
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  coverImage: {
    height: 120,
    backgroundColor: colors.primary,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginTop: -40,
    borderWidth: 4,
    borderColor: colors.cardBackground,
    borderRadius: 44,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  username: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: spacing.xl,
  },
  followButton: {
    minWidth: 140,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
