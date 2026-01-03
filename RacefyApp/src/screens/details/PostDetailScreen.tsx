import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Loading,
  Avatar,
  ScreenHeader,
  MediaGallery,
  CommentSection,
} from '../../components';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Post, User } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

const { width: screenWidth } = Dimensions.get('window');

// Helper functions
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
};

const formatPace = (meters: number, seconds: number): string => {
  if (meters === 0) return '-';
  const paceSecondsPerKm = (seconds / meters) * 1000;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.floor(paceSecondsPerKm % 60);
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;
};

const getSportIcon = (sportName?: string): keyof typeof Ionicons.glyphMap => {
  const name = sportName?.toLowerCase() || '';
  if (name.includes('run')) return 'walk-outline';
  if (name.includes('cycling') || name.includes('bike')) return 'bicycle-outline';
  if (name.includes('swim')) return 'water-outline';
  if (name.includes('gym') || name.includes('fitness')) return 'barbell-outline';
  if (name.includes('yoga')) return 'body-outline';
  return 'fitness-outline';
};

export function PostDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { postId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const fetchPost = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getPost(postId);
      setPost(data);
      setIsLiked(data.is_liked || false);
      setLikesCount(data.likes_count);
    } catch (err) {
      setError(t('feed.failedToLoad'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [postId, t]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikesCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  };

  const handleDelete = () => {
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
              await api.deletePost(postId);
              navigation.goBack();
            } catch {
              Alert.alert(t('common.error'), t('feed.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleUserPress = (user: User) => {
    navigation.navigate('UserProfile', { username: user.username });
  };

  const timeAgo = post
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : '';

  const isOwner = currentUser?.id === post?.user_id;

  const renderActivityPreview = () => {
    if (post?.type !== 'activity' || !post.activity) return null;
    const activity = post.activity;

    return (
      <TouchableOpacity
        style={[styles.activityPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
        onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
      >
        <View style={styles.activityHeader}>
          <View style={[styles.sportBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons
              name={getSportIcon(activity.sport_type?.name)}
              size={18}
              color={colors.primary}
            />
          </View>
          <View style={styles.activityTitleContainer}>
            <Text style={[styles.activityTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {activity.title}
            </Text>
            <Text style={[styles.activitySport, { color: colors.textSecondary }]}>
              {activity.sport_type?.name || t('activityDetail.activity')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>

        <View style={[styles.activityStats, { borderTopColor: colors.borderLight }]}>
          <View style={styles.activityStatItem}>
            <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>
              {formatDistance(activity.distance)}
            </Text>
          </View>
          <View style={styles.activityStatItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>
              {formatDuration(activity.duration)}
            </Text>
          </View>
          <View style={styles.activityStatItem}>
            <Ionicons name="speedometer-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.activityStatValue, { color: colors.textPrimary }]}>
              {formatPace(activity.distance, activity.duration)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventPreview = () => {
    if (post?.type !== 'event' || !post.event) return null;
    const event = post.event;

    return (
      <TouchableOpacity
        style={[styles.eventPreview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      >
        <View style={styles.eventHeader}>
          <View style={[styles.eventDateBadge, { backgroundColor: colors.warning }]}>
            <Text style={[styles.eventDateDay, { color: colors.white }]}>
              {format(new Date(event.starts_at), 'd')}
            </Text>
            <Text style={[styles.eventDateMonth, { color: colors.white }]}>
              {format(new Date(event.starts_at), 'MMM')}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {post.title || t('eventDetail.untitled')}
            </Text>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message={t('common.loading')} />;
  }

  if (error || !post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('feed.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || t('feed.failedToLoad')}
          </Text>
          <Button title={t('common.tryAgain')} onPress={fetchPost} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const mediaWidth = screenWidth - spacing.md * 2;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        title={t('feed.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          isOwner ? (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post content */}
          <Card style={styles.postCard}>
            {/* Header */}
            <TouchableOpacity
              style={styles.header}
              onPress={() => post.user && handleUserPress(post.user)}
              disabled={!post.user}
            >
              <Avatar uri={post.user?.avatar} name={post.user?.name} size="md" />
              <View style={styles.userText}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{post.user?.name}</Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]}>
                  @{post.user?.username} · {timeAgo}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Content */}
            {post.content && (
              <Text style={[styles.content, { color: colors.textPrimary }]}>{post.content}</Text>
            )}

            {/* Activity/Event Preview */}
            {renderActivityPreview()}
            {renderEventPreview()}

            {/* Media */}
            {((post.media && post.media.length > 0) ||
              (post.photos && post.photos.length > 0) ||
              (post.videos && post.videos.length > 0)) && (
              <View style={styles.mediaContainer}>
                <MediaGallery
                  media={post.media}
                  photos={post.photos}
                  videos={post.videos}
                  width={mediaWidth}
                />
              </View>
            )}

            {/* Actions */}
            <View style={[styles.actions, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? colors.error : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: isLiked ? colors.error : colors.textSecondary },
                  ]}
                >
                  {likesCount}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {post.comments_count}
                </Text>
              </View>
            </View>
          </Card>

          {/* Comments Section */}
          <View style={styles.commentsContainer}>
            <CommentSection
              commentableType="post"
              commentableId={postId}
              commentsCount={post.comments_count}
              initialExpanded={true}
              onUserPress={handleUserPress}
              onInputFocus={scrollToBottom}
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  postCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: fontSize.sm,
  },
  content: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  mediaContainer: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.md,
  },
  activityPreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activityTitleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activitySport: {
    fontSize: fontSize.xs,
  },
  activityStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    justifyContent: 'space-around',
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  eventPreview: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateDay: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  eventDateMonth: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventLocation: {
    fontSize: fontSize.xs,
    marginLeft: 4,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  actionText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
  },
  commentsContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
});
