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
  Image,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
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
import { useUnreadCount } from '../../hooks/useUnreadCount';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { BottomTabScreenProps, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type FeedScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Feed'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = BottomTabScreenProps<MainTabParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props & { navigation: FeedScreenNavigationProp }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { count: unreadCount } = useUnreadCount();
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      await createPost(newPostContent.trim(), selectedImage || undefined);
      setNewPostContent('');
      setSelectedImage(null);
    } catch (error) {
      Alert.alert(t('common.error'), t('feed.failedToCreate'));
    } finally {
      setIsPosting(false);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.gallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === 'ios',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.camera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: Platform.OS === 'ios',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePickImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('feed.takePhoto'), t('feed.chooseFromLibrary')],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickImageFromCamera();
          } else if (buttonIndex === 2) {
            pickImageFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        t('feed.addPhoto'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('feed.takePhoto'), onPress: pickImageFromCamera },
          { text: t('feed.chooseFromLibrary'), onPress: pickImageFromGallery },
        ]
      );
    }
  };

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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
      </SafeAreaView>
    );
  }

  if (isLoading && posts.length === 0) {
    return <Loading fullScreen message={t('feed.loadingFeed')} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('feed.title')}</Text>
        <TouchableOpacity
          style={styles.messagesButton}
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
              if (item.user?.username) {
                navigation.navigate('UserProfile', { username: item.user.username });
              }
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
                style={[styles.createPostInput, { color: colors.textPrimary }]}
                placeholder={t('feed.placeholder')}
                placeholderTextColor={colors.textMuted}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
              />
            </View>
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            )}
            <View style={[styles.createPostActions, { borderTopColor: colors.borderLight }]}>
              <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                <Ionicons
                  name={selectedImage ? 'image' : 'image-outline'}
                  size={20}
                  color={selectedImage ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.photoButtonText, { color: selectedImage ? colors.primary : colors.textSecondary }]}>{t('feed.photo')}</Text>
              </TouchableOpacity>
              <Button
                title={t('feed.post')}
                onPress={handleCreatePost}
                loading={isPosting}
                disabled={!newPostContent.trim() && !selectedImage}
                style={styles.postButton}
              />
            </View>
          </Card>
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
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
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
  messagesButton: {
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
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  photoButtonText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
  },
  postButton: {
    paddingHorizontal: spacing.xl,
  },
  imagePreviewContainer: {
    marginTop: spacing.md,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
