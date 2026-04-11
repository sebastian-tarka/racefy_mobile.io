import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {AnimatedListItem, Avatar, EmptyState, FeedCard, Loading, ScreenContainer,} from '../../components';
import {ActivitiesFeedPreview} from './home/components';
import {useAuth} from '../../hooks/useAuth';
import {useFeed} from '../../hooks/useFeed';
import {useUnreadCount} from '../../hooks/useUnreadCount';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../hooks/useTheme';
import {useVideoPauseOnBlur} from '../../hooks/useVideoPauseOnBlur';
import {api} from '../../services/api';
import {logger} from '../../services/logger';
import {borderRadius, fontSize, spacing} from '../../theme';
import type {BottomTabNavigationProp, BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';
import type {Event, Post, User} from '../../types/api';
import {useRefreshOn} from "../../services/refreshEvents";

type FeedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Feed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = BottomTabScreenProps<MainTabParamList, 'Feed'> & {
  navigation: FeedScreenNavigationProp;
};

interface SearchResults {
  users: User[];
  events: Event[];
  posts: Post[];
}

export function FeedScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = 60 + insets.bottom + spacing.md;
  const { user, isAuthenticated } = useAuth();
  const { count: unreadCount, refresh: refreshUnreadCount } = useUnreadCount();
  const {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    applyLikeChange,
    applyBoostChange,
    deletePost,
    resharePost,
    unresharePost,
  } = useFeed();

  useRefreshOn('feed', refresh);
  useRefreshOn('messages', refreshUnreadCount);

  // Pause all videos when navigating away from this screen
  useVideoPauseOnBlur();

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnimValue = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated, refresh]);

  // Cleanup search debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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
  }, [isSearchVisible, searchAnimValue]);

  // Handle search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.search({ query, type: 'all', per_type: 5 });
      setSearchResults({
        users: response.results.users.data,
        events: response.results.events.data,
        posts: response.results.posts.data,
      });
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

  const handleDeletePost = (postId: number) => {
    Alert.alert(
      t('feed.deletePost'),
      t('feed.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
            } catch (error) {
              Alert.alert(t('common.error'), t('feed.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleReportPost = (postId: number) => {
    Alert.alert(
      t('feed.reportPost'),
      t('feed.reportConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('feed.report'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.reportPost(postId, 'Inappropriate content');
              Alert.alert(t('common.success'), t('feed.reportSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), t('feed.reportFailed'));
            }
          },
        },
      ]
    );
  };

  const handleEditPost = (postId: number) => {
    navigation.navigate('PostForm', { postId });
  };

  const renderFeedItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <AnimatedListItem index={index}>
    <FeedCard
      post={item}
      isOwner={item.is_owner ?? item.user_id === user?.id}
      onLikeChange={(isLiked, count) => applyLikeChange(item.id, isLiked, count)}
      onBoostChange={(isBoosted, count) => applyBoostChange(item.id, isBoosted, count)}
      onComment={() => navigation.navigate('PostDetail', { postId: item.id, focusComments: true })}
      onShareActivity={
        item.type === 'activity' && item.activity
          ? () => navigation.navigate('ActivityShare', { activityId: item.activity!.id, hasGpsTrack: item.activity!.has_gps_track, photos: item.activity!.photos })
          : undefined
      }
      onUserPress={() => {
        if (item.user?.username) {
          navigation.navigate('UserProfile', { username: item.user.username });
        }
      }}
      onActivityPress={
        item.type === 'activity' && item.activity
          ? () => navigation.navigate('ActivityDetail', { activityId: item.activity!.id })
          : undefined
      }
      onEventPress={
        item.type === 'event' && item.event
          ? () => navigation.navigate('EventDetail', { eventId: item.event!.id })
          : (item as any).tagged_event
            ? () => navigation.navigate('EventDetail', { eventId: (item as any).tagged_event!.id })
            : undefined
      }
      onReshare={(content, visibility) => resharePost(item.id, { content, visibility: visibility as any })}
      onUnreshare={() => unresharePost(item.id)}
      onOriginalPostUserPress={(username) => navigation.navigate('UserProfile', { username })}
      onMenu={(action) => {
        if (action === 'delete') handleDeletePost(item.id);
        else if (action === 'report') handleReportPost(item.id);
        else if (action === 'edit') handleEditPost(item.id);
      }}
    />
    </AnimatedListItem>
  ), [user?.id, applyLikeChange, applyBoostChange, navigation, handleDeletePost, handleReportPost, resharePost, unresharePost]);

  const renderSearchResults = () => {
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
              placeholder={t('search.placeholder')}
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

  const renderSearchResultsContent = () => {
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

    if (!searchResults) return null;

    const hasResults =
      searchResults.users.length > 0 ||
      searchResults.events.length > 0 ||
      searchResults.posts.length > 0;

    if (!hasResults) {
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
      <ScrollView
        style={styles.searchResultsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Users */}
        {searchResults.users.length > 0 && (
          <View style={styles.searchSection}>
            <Text style={[styles.searchSectionTitle, { color: colors.textSecondary }]}>
              {t('search.users')}
            </Text>
            {searchResults.users.map((searchUser) => (
              <TouchableOpacity
                key={`user-${searchUser.id}`}
                style={[styles.searchResultItem, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  setIsSearchVisible(false);
                  setSearchQuery('');
                  setSearchResults(null);
                  navigation.navigate('UserProfile', { username: searchUser.username });
                }}
              >
                <Avatar uri={searchUser.avatar_url} name={searchUser.name} size="sm" />
                <View style={styles.searchResultInfo}>
                  <Text style={[styles.searchResultName, { color: colors.textPrimary }]}>
                    {searchUser.name}
                  </Text>
                  <Text style={[styles.searchResultMeta, { color: colors.textMuted }]}>
                    @{searchUser.username}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Events */}
        {searchResults.events.length > 0 && (
          <View style={styles.searchSection}>
            <Text style={[styles.searchSectionTitle, { color: colors.textSecondary }]}>
              {t('search.events')}
            </Text>
            {searchResults.events.map((event) => (
              <TouchableOpacity
                key={`event-${event.id}`}
                style={[styles.searchResultItem, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  setIsSearchVisible(false);
                  setSearchQuery('');
                  setSearchResults(null);
                  navigation.navigate('EventDetail', { eventId: event.id });
                }}
              >
                <View style={[styles.searchResultIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <View style={styles.searchResultInfo}>
                  <Text style={[styles.searchResultName, { color: colors.textPrimary }]}>
                    {event.post?.title || t('eventDetail.untitled')}
                  </Text>
                  <Text style={[styles.searchResultMeta, { color: colors.textMuted }]}>
                    {event.location_name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Posts */}
        {searchResults.posts.length > 0 && (
          <View style={styles.searchSection}>
            <Text style={[styles.searchSectionTitle, { color: colors.textSecondary }]}>
              {t('search.posts')}
            </Text>
            {searchResults.posts.map((post) => (
              <TouchableOpacity
                key={`post-${post.id}`}
                style={[styles.searchResultItem, { backgroundColor: colors.cardBackground }]}
                onPress={() => {
                  setIsSearchVisible(false);
                  setSearchQuery('');
                  setSearchResults(null);
                  navigation.navigate('PostDetail', { postId: post.id });
                }}
              >
                <Avatar uri={post.user?.avatar_url} name={post.user?.name} size="sm" />
                <View style={styles.searchResultInfo}>
                  <Text style={[styles.searchResultName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {post.title || post.content}
                  </Text>
                  <Text style={[styles.searchResultMeta, { color: colors.textMuted }]}>
                    {post.user?.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer>
        <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('feed.title')}</Text>
        </View>
        <EmptyState
          icon="lock-closed-outline"
          title={t('feed.signInRequired')}
          message={t('feed.signInDescription')}
          actionLabel={t('common.signIn')}
          onAction={() =>
            navigation.getParent()?.navigate('Auth', { screen: 'Login' })
          }
        />
      </ScreenContainer>
    );
  }

  if (isLoading && posts.length === 0) {
    return <Loading fullScreen message={t('feed.loadingFeed')} />;
  }

  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('feed.title')}</Text>
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
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('PostForm', {})}
          >
            <Ionicons
              name="add-circle-outline"
              size={26}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('ConversationsList')}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                <Text style={[styles.unreadBadgeText, { color: colors.white }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {renderSearchResults()}

      {isSearchVisible && searchQuery.length > 0 ? (
        renderSearchResultsContent()
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          removeClippedSubviews={true}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
          renderItem={renderFeedItem}
          ListHeaderComponent={
            <ActivitiesFeedPreview
              onActivityPress={(activityId) => navigation.navigate('ActivityDetail', { activityId })}
              onLoginPress={() => navigation.getParent()?.navigate('Auth', { screen: 'Login' })}
              limit={3}
            />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState
                icon="alert-circle-outline"
                title={t('feed.failedToLoad')}
                message={error}
                actionLabel={t('common.tryAgain')}
                onAction={refresh}
              />
            ) : (
              <EmptyState
                icon="newspaper-outline"
                title={t('feed.noPosts')}
                message={t('feed.beFirst')}
              />
            )
          }
          ListFooterComponent={
            isLoading && posts.length > 0 ? (
              <Loading message={t('feed.loadingMore')} />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
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
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
  searchResultsScroll: {
    flex: 1,
  },
  searchSection: {
    paddingTop: spacing.md,
  },
  searchSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  searchResultMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  // List styles
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
});
