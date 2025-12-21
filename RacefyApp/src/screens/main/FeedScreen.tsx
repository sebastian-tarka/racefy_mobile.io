import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PostCard,
  Card,
  Avatar,
  Loading,
  EmptyState,
  Button,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useFeed } from '../../hooks/useFeed';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props) {
  const { user, isAuthenticated } = useAuth();
  const {
    posts,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    toggleLike,
    createPost,
    deletePost,
  } = useFeed();

  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    setIsPosting(true);
    try {
      await createPost(newPostContent.trim());
      setNewPostContent('');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = (postId: number) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(postId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Feed</Text>
        </View>
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in to view feed"
          message="Connect with other athletes and share your activities"
          actionLabel="Sign In"
          onAction={() =>
            navigation.getParent()?.navigate('Auth', { screen: 'Login' })
          }
        />
      </SafeAreaView>
    );
  }

  if (isLoading && posts.length === 0) {
    return <Loading fullScreen message="Loading feed..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => toggleLike(item)}
            onComment={() => {
              // Navigate to post detail
            }}
            onUserPress={() => {
              // Navigate to user profile
            }}
            onMenuPress={() => handleDeletePost(item.id)}
            isOwner={item.user_id === user?.id}
          />
        )}
        ListHeaderComponent={
          <Card style={styles.createPostCard}>
            <View style={styles.createPostHeader}>
              <Avatar uri={user?.avatar} name={user?.name} size="md" />
              <TextInput
                style={styles.createPostInput}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textMuted}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
              />
            </View>
            <View style={styles.createPostActions}>
              <TouchableOpacity style={styles.photoButton}>
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.photoButtonText}>Photo</Text>
              </TouchableOpacity>
              <Button
                title="Post"
                onPress={handleCreatePost}
                loading={isPosting}
                disabled={!newPostContent.trim()}
                style={styles.postButton}
              />
            </View>
          </Card>
        }
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Failed to load feed"
              message={error}
              actionLabel="Try Again"
              onAction={refresh}
            />
          ) : (
            <EmptyState
              icon="newspaper-outline"
              title="No posts yet"
              message="Be the first to share something!"
            />
          )
        }
        ListFooterComponent={
          isLoading && posts.length > 0 ? (
            <Loading message="Loading more..." />
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
        contentContainerStyle={styles.listContent}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  createPostCard: {
    marginBottom: spacing.md,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  createPostInput: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  createPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  photoButtonText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  postButton: {
    paddingHorizontal: spacing.xl,
  },
});
