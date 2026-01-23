import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  EmptyState,
  PostCard,
  ActivityCard,
  EventCard,
  UserListModal,
  UserProfileHeader,
  ScreenHeader,
  PointsCard,
  BottomSheet,
  ReportModal,
} from '../../components';
import type { TabType } from '../../components/ProfileTabs';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePaginatedTabData } from '../../hooks/usePaginatedTabData';
import { useUserPointStats } from '../../hooks/usePointStats';
import { useBlockUser } from '../../hooks/useBlockUser';
import { api } from '../../services/api';
import {
  canViewFollowersList,
  canViewFollowingList,
  canSendMessage,
} from '../../utils/privacy';
import { spacing } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Post, Activity, Event, User } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

export function UserProfileScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user: currentUser, isAuthenticated } = useAuth();

  // Profile management
  const {
    profile,
    isLoading,
    error,
    isFollowing,
    isFollowLoading,
    isMessageLoading,
    fetchProfile,
    handleFollowToggle,
    handleStartConversation,
  } = useUserProfile({ username });

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Block user hook
  const { blockUser } = useBlockUser();

  // Paginated data for each tab
  const postsData = usePaginatedTabData<Post>({
    fetchFunction: api.getUserPosts.bind(api),
    userId: profile?.id ?? null,
  });

  const activitiesData = usePaginatedTabData<Activity>({
    fetchFunction: api.getUserActivities.bind(api),
    userId: profile?.id ?? null,
  });

  const eventsData = usePaginatedTabData<Event>({
    fetchFunction: useCallback(
      async (userId: number, page: number) => {
        return api.getEvents({ user_id: userId, page });
      },
      []
    ),
    userId: profile?.id ?? null,
  });

  const isOwnProfile = currentUser?.username === username;

  // User point stats
  const {
    stats: userPointStats,
    isLoading: isLoadingPointStats,
    refetch: refetchPointStats,
  } = useUserPointStats({ username, autoLoad: true });

  // Load initial posts when profile is loaded
  useEffect(() => {
    if (profile && postsData.data.length === 0) {
      postsData.fetchData(1, true);
    }
  }, [profile?.id]);

  // Load data when tab changes
  useEffect(() => {
    if (!profile) return;

    if (activeTab === 'posts' && postsData.data.length === 0) {
      postsData.fetchData(1, true);
    } else if (activeTab === 'activities' && activitiesData.data.length === 0) {
      activitiesData.fetchData(1, true);
    } else if (activeTab === 'events' && eventsData.data.length === 0) {
      eventsData.fetchData(1, true);
    }
  }, [activeTab, profile?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfile();

    if (activeTab === 'posts') {
      await postsData.refresh();
    } else if (activeTab === 'stats') {
      await refetchPointStats();
    } else if (activeTab === 'activities') {
      await activitiesData.refresh();
    } else if (activeTab === 'events') {
      await eventsData.refresh();
    }

    setIsRefreshing(false);
  };

  const handleMessagePress = async () => {
    const result = await handleStartConversation();
    if (result) {
      navigation.navigate('Chat', {
        conversationId: result.conversationId,
        participant: result.participant,
      });
    }
  };

  const handleUserNavigation = (user: User) => {
    setShowFollowersModal(false);
    setShowFollowingModal(false);
    navigation.push('UserProfile', { username: user.username });
  };

  const handleBlockUser = async () => {
    setShowActionSheet(false);
    if (!profile) return;

    await blockUser(profile.id, profile.username, () => {
      // Navigate back after successful block
      navigation.goBack();
    });
  };

  const handleReportUser = () => {
    setShowActionSheet(false);
    setShowReportModal(true);
  };

  // Privacy checks
  const canViewFollowers = profile
    ? canViewFollowersList(profile, currentUser ?? null, isFollowing)
    : false;
  const canViewFollowing = profile
    ? canViewFollowingList(profile, currentUser ?? null, isFollowing)
    : false;
  const canMessageUser = profile
    ? canSendMessage(profile, currentUser ?? null, isFollowing)
    : false;

  // Tab configuration
  const tabs = [
    { label: t('profile.tabs.posts'), value: 'posts' as TabType, icon: 'newspaper-outline' as const },
    { label: t('profile.tabs.stats'), value: 'stats' as TabType, icon: 'stats-chart' as const },
    { label: t('profile.tabs.activities'), value: 'activities' as TabType, icon: 'fitness-outline' as const },
    { label: t('profile.tabs.events'), value: 'events' as TabType, icon: 'calendar-outline' as const },
  ];

  // Get current tab data
  const getCurrentTabData = () => {
    if (activeTab === 'posts') return postsData;
    if (activeTab === 'stats') return { data: [], isLoading: isLoadingPointStats, loadMore: () => {} };
    if (activeTab === 'activities') return activitiesData;
    return eventsData;
  };

  const currentTabData = getCurrentTabData();

  // Render functions
  const renderProfileHeader = () => {
    if (!profile) return null;

    return (
      <>
        <UserProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          isAuthenticated={isAuthenticated}
          isFollowing={isFollowing}
          isFollowLoading={isFollowLoading}
          isMessageLoading={isMessageLoading}
          canMessage={canMessageUser}
          activeTab={activeTab}
          tabs={tabs}
          onBackPress={() => navigation.goBack()}
          onFollowersPress={() => setShowFollowersModal(true)}
          onFollowingPress={() => setShowFollowingModal(true)}
          onFollowToggle={handleFollowToggle}
          onMessagePress={handleMessagePress}
          onTabChange={setActiveTab}
          onMenuPress={() => setShowActionSheet(true)}
        />
        {activeTab === 'stats' && (
          <View style={styles.statsTabContent}>
            <PointsCard
              stats={userPointStats}
              isLoading={isLoadingPointStats}
            />
          </View>
        )}
      </>
    );
  };

  const renderFooter = () => {
    if (!currentTabData.isLoading) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    // Stats tab content is rendered in header
    if (activeTab === 'stats') return null;

    if (currentTabData.isLoading && currentTabData.data.length === 0) return null;

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

  const getKeyExtractor = (item: Post | Activity | Event) => {
    return `${activeTab}-${item.id}`;
  };

  const renderItem = ({ item }: { item: Post | Activity | Event }) => {
    if (activeTab === 'posts') {
      const post = item as Post;
      return (
        <PostCard
          post={post}
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

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title={t('profile.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader title={t('profile.title')} showBack onBack={() => navigation.goBack()} />
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={currentTabData.data}
        keyExtractor={getKeyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderProfileHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={currentTabData.loadMore}
        onEndReachedThreshold={0.5}
      />

      {profile && (
        <>
          <UserListModal
            visible={showFollowersModal}
            onClose={() => setShowFollowersModal(false)}
            title={t('profile.followersList.title')}
            userId={profile.id}
            listType="followers"
            onUserPress={handleUserNavigation}
            isRestricted={!canViewFollowers}
          />
          <UserListModal
            visible={showFollowingModal}
            onClose={() => setShowFollowingModal(false)}
            title={t('profile.followingList.title')}
            userId={profile.id}
            listType="following"
            onUserPress={handleUserNavigation}
            isRestricted={!canViewFollowing}
          />

          {!isOwnProfile && isAuthenticated && (
            <>
              <BottomSheet
                visible={showActionSheet}
                onClose={() => setShowActionSheet(false)}
                options={[
                  {
                    label: t('reporting.reportUser'),
                    icon: 'flag-outline',
                    onPress: handleReportUser,
                    color: colors.warning,
                  },
                  {
                    label: t('blocking.blockAction'),
                    icon: 'ban-outline',
                    onPress: handleBlockUser,
                    color: colors.error,
                  },
                ]}
              />
              <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                reportableType="user"
                reportableId={profile.id}
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statsTabContent: {
    marginTop: spacing.md,
  },
});