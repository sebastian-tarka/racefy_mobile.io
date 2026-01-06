import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Input,
  Button,
  ScreenHeader,
  MediaPicker,
  MediaThumbnail,
} from '../../components';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { fixStorageUrl } from '../../config/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Post, Media, Photo, Video, MediaItem } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PostForm'>;

type PostVisibility = 'public' | 'followers' | 'private';

// Existing media from server
interface ExistingMedia {
  id: number;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string | null;
}

export function PostFormScreen({ navigation, route }: Props) {
  const { postId } = route.params || {};
  const isEditMode = !!postId;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [newMedia, setNewMedia] = useState<MediaItem[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<ExistingMedia[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && postId) {
      fetchPost(postId);
    }
  }, [postId]);

  const fetchPost = async (id: number) => {
    setIsFetching(true);
    try {
      const post = await api.getPost(id);
      populateForm(post);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      Alert.alert(t('common.error'), t('postForm.failedToLoad'));
      navigation.goBack();
    } finally {
      setIsFetching(false);
    }
  };

  const populateForm = (post: Post) => {
    setContent(post.content || '');
    setTitle(post.title || '');
    setVisibility(post.visibility || 'public');

    // Convert all media sources to unified format
    const mediaItems: ExistingMedia[] = [];

    // Add photos
    if (post.photos && post.photos.length > 0) {
      post.photos.forEach((photo: Photo) => {
        const url = fixStorageUrl(photo.url);
        if (url) {
          mediaItems.push({
            id: photo.id,
            type: 'image',
            url,
          });
        }
      });
    }

    // Add videos
    if (post.videos && post.videos.length > 0) {
      post.videos.forEach((video: Video) => {
        const url = fixStorageUrl(video.url);
        if (url) {
          mediaItems.push({
            id: video.id,
            type: 'video',
            url,
            thumbnail_url: video.thumbnail_url ? fixStorageUrl(video.thumbnail_url) : null,
          });
        }
      });
    }

    // Add unified media array
    if (post.media && post.media.length > 0) {
      post.media.forEach((media: Media) => {
        // Avoid duplicates if both arrays are present
        if (!mediaItems.some(m => m.id === media.id)) {
          const url = fixStorageUrl(media.url);
          if (url) {
            mediaItems.push({
              id: media.id,
              type: media.type,
              url,
              thumbnail_url: media.thumbnail_url ? fixStorageUrl(media.thumbnail_url) : null,
            });
          }
        }
      });
    }

    setExistingMedia(mediaItems);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = t('postForm.validation.contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRemoveExistingMedia = (media: ExistingMedia) => {
    setExistingMedia(prev => prev.filter(m => m.id !== media.id));
    setMediaToDelete(prev => [...prev, media]);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (isEditMode && postId) {
        // Update post content and visibility
        await api.updatePost(postId, {
          content: content.trim(),
          title: title.trim() || undefined,
          visibility,
        });

        // Delete removed media
        for (const media of mediaToDelete) {
          try {
            await api.deletePostMedia(media.id, media.type);
          } catch (error) {
            console.error(`Failed to delete ${media.type}:`, error);
          }
        }

        // Upload new media
        for (const mediaItem of newMedia) {
          try {
            await api.uploadPostMedia(postId, mediaItem);
          } catch (error) {
            console.error('Failed to upload media:', error);
          }
        }

        Alert.alert(t('common.success'), t('postForm.updateSuccess'));
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save post:', error);
      Alert.alert(
        t('common.error'),
        t('postForm.updateFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const visibilityOptions: { value: PostVisibility; label: string; icon: string }[] = [
    { value: 'public', label: t('settings.public'), icon: 'globe-outline' },
    { value: 'followers', label: t('settings.followersOnly'), icon: 'people-outline' },
    { value: 'private', label: t('settings.private'), icon: 'lock-closed-outline' },
  ];

  const totalMediaCount = existingMedia.length + newMedia.length;
  const maxItems = 10;
  const canAddMore = totalMediaCount < maxItems;

  if (isFetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('postForm.editTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title={t('postForm.editTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title (optional) */}
          <Input
            label={t('postForm.title')}
            placeholder={t('postForm.titlePlaceholder')}
            value={title}
            onChangeText={setTitle}
          />

          {/* Content */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('postForm.content')}
            </Text>
            <Input
              placeholder={t('postForm.contentPlaceholder')}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                if (errors.content) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.content;
                    return newErrors;
                  });
                }
              }}
              multiline
              numberOfLines={6}
              style={styles.textArea}
              error={errors.content}
            />
          </View>

          {/* Visibility Selector */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('postForm.visibility')}
            </Text>
            <View style={styles.visibilityContainer}>
              {visibilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.visibilityOption,
                    {
                      backgroundColor: visibility === option.value
                        ? colors.primary
                        : colors.cardBackground,
                      borderColor: visibility === option.value
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => setVisibility(option.value)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={visibility === option.value ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.visibilityLabel,
                      {
                        color: visibility === option.value ? '#fff' : colors.textPrimary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Media Section */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('postForm.media')}
            </Text>

            {/* Existing Media */}
            {existingMedia.length > 0 && (
              <View style={styles.existingMediaContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaScrollContent}
                >
                  {existingMedia.map((media) => (
                    <View key={`existing-${media.id}`} style={styles.mediaThumbnail}>
                      <Image
                        source={{ uri: media.thumbnail_url || media.url }}
                        style={styles.thumbnailImage}
                      />
                      {media.type === 'video' && (
                        <View style={styles.videoOverlay}>
                          <Ionicons name="play-circle" size={24} color="#fff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: colors.error }]}
                        onPress={() => handleRemoveExistingMedia(media)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* New Media Picker */}
            {canAddMore && (
              <View style={styles.newMediaSection}>
                {(existingMedia.length > 0 || newMedia.length > 0) && (
                  <Text style={[styles.subLabel, { color: colors.textMuted }]}>
                    {t('postForm.addMoreMedia')}
                  </Text>
                )}
                <MediaPicker
                  media={newMedia}
                  onChange={setNewMedia}
                  maxItems={maxItems - existingMedia.length}
                  allowVideo
                />
              </View>
            )}

            {totalMediaCount > 0 && (
              <Text style={[styles.mediaCount, { color: colors.textMuted }]}>
                {totalMediaCount}/{maxItems} {t('postForm.mediaItems')}
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <Button
            title={t('postForm.updateButton')}
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  subLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  visibilityLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  existingMediaContainer: {
    marginBottom: spacing.sm,
  },
  mediaScrollContent: {
    gap: spacing.sm,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newMediaSection: {
    marginTop: spacing.xs,
  },
  mediaCount: {
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
