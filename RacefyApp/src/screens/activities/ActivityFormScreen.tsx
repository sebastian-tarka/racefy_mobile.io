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
  Switch,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  Input,
  Button,
  ScreenHeader,
} from '../../components';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useTheme } from '../../hooks/useTheme';
import { fixStorageUrl } from '../../config/api';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Activity, Photo, MediaItem } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ActivityForm'>;

export function ActivityFormScreen({ navigation, route }: Props) {
  const { activityId } = route.params || {};
  const isEditMode = !!activityId;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);

  // GPS Privacy (new in 2026-01)
  const [hasGpsTrack, setHasGpsTrack] = useState(false);
  const [showStartFinishPoints, setShowStartFinishPoints] = useState(false);

  // Photo management
  const [existingPhotos, setExistingPhotos] = useState<Photo[]>([]);
  const [newPhotos, setNewPhotos] = useState<MediaItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const MAX_PHOTOS = 10;

  useEffect(() => {
    if (isEditMode && activityId) {
      fetchActivity(activityId);
    }
  }, [activityId]);

  const fetchActivity = async (id: number) => {
    setIsFetching(true);
    try {
      const activity = await api.getActivity(id);
      populateForm(activity);
    } catch (error) {
      logger.error('api', 'Failed to fetch activity', { error });
      Alert.alert(t('common.error'), t('activityForm.failedToLoad'));
      navigation.goBack();
    } finally {
      setIsFetching(false);
    }
  };

  const populateForm = (activity: Activity) => {
    setTitle(activity.title || '');
    setDescription(activity.description || '');
    setIsPrivate(activity.is_private || false);
    setExistingPhotos(activity.photos || []);
    // GPS Privacy
    setHasGpsTrack(activity.has_gps_track || false);
    setShowStartFinishPoints(activity.show_start_finish_points || false);
  };

  // GPS Privacy handler
  const handleGpsPrivacyToggle = async (value: boolean) => {
    if (!activityId) return;

    try {
      await api.updateActivityGpsPrivacy(activityId, value);
      setShowStartFinishPoints(value);
      Alert.alert(
        t('common.success'),
        value
          ? t('activityForm.gpsPrivacyEnabled')
          : t('activityForm.gpsPrivacyDisabled')
      );
    } catch (error) {
      logger.error('api', 'Failed to update GPS privacy', { error });
      Alert.alert(t('common.error'), t('activityForm.gpsPrivacyFailed'));
    }
  };

  // Photo management functions
  const totalPhotos = existingPhotos.length + newPhotos.length;
  const canAddMorePhotos = totalPhotos < MAX_PHOTOS;

  const pickPhotos = async () => {
    if (!canAddMorePhotos) {
      Alert.alert(t('common.error'), t('activityForm.maxPhotosReached', { count: MAX_PHOTOS }));
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.gallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - totalPhotos,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newMedia: MediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image' as const,
        width: asset.width,
        height: asset.height,
      }));
      setNewPhotos((prev) => [...prev, ...newMedia].slice(0, MAX_PHOTOS - existingPhotos.length));
    }
  };

  const takePhoto = async () => {
    if (!canAddMorePhotos) {
      Alert.alert(t('common.error'), t('activityForm.maxPhotosReached', { count: MAX_PHOTOS }));
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('permissions.camera'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setNewPhotos((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: 'image' as const,
          width: asset.width,
          height: asset.height,
        },
      ]);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(t('activityForm.addPhoto'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('feed.chooseFromLibrary'), onPress: pickPhotos },
      { text: t('feed.takePhoto'), onPress: takePhoto },
    ]);
  };

  const handleDeleteExistingPhoto = (photo: Photo) => {
    Alert.alert(
      t('activityForm.deletePhoto'),
      t('activityForm.deletePhotoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePhoto(photo.id);
              setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            } catch (error) {
              logger.error('api', 'Failed to delete photo', { error });
              Alert.alert(t('common.error'), t('activityForm.deletePhotoFailed'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadNewPhotos = async () => {
    if (!activityId || newPhotos.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (const photo of newPhotos) {
        const formData = new FormData();
        const filename = photo.uri.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('photo', {
          uri: photo.uri,
          type: mimeType,
          name: filename,
        } as any);

        await api.uploadActivityPhoto(activityId, formData);
      }
      setNewPhotos([]);
    } catch (error) {
      logger.error('api', 'Failed to upload photos', { error });
      throw error;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t('activityForm.validation.titleRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (isEditMode && activityId) {
        // Update activity details
        await api.updateActivity(activityId, {
          title: title.trim(),
          description: description.trim() || undefined,
          is_private: isPrivate,
        });

        // Upload any new photos
        if (newPhotos.length > 0) {
          await uploadNewPhotos();
        }

        Alert.alert(t('common.success'), t('activityForm.updateSuccess'));
      }
      navigation.goBack();
    } catch (error) {
      logger.error('api', 'Failed to save activity', { error });
      Alert.alert(
        t('common.error'),
        t('activityForm.updateFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScreenHeader
          title={t('activityForm.editTitle')}
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
          title={t('activityForm.editTitle')}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Input
            label={t('activityForm.title')}
            placeholder={t('activityForm.titlePlaceholder')}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.title;
                  return newErrors;
                });
              }
            }}
            error={errors.title}
          />

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('activityForm.description')}
            </Text>
            <Input
              placeholder={t('activityForm.descriptionPlaceholder')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={styles.textArea}
            />
          </View>

          {/* Privacy Toggle */}
          <View style={[styles.switchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                {t('activityForm.privateActivity')}
              </Text>
              <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                {t('activityForm.privateDescription')}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* GPS Privacy Toggle (only show if activity has GPS track) */}
          {hasGpsTrack && (
            <View style={[styles.switchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.switchContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="location-outline" size={20} color={colors.primary} />
                  <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                    {t('activityForm.gpsPrivacy')}
                  </Text>
                </View>
                <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>
                  {t('activityForm.gpsPrivacyDescription')}
                </Text>
              </View>
              <Switch
                value={showStartFinishPoints}
                onValueChange={handleGpsPrivacyToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          )}

          {/* Photos Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('activityForm.photos')}
              </Text>
              <Text style={[styles.photoCount, { color: colors.textMuted }]}>
                {totalPhotos}/{MAX_PHOTOS}
              </Text>
            </View>

            {/* Photo Grid */}
            <View style={styles.photoGrid}>
              {/* Existing Photos */}
              {existingPhotos.map((photo) => (
                <View key={`existing-${photo.id}`} style={styles.photoItem}>
                  <Image
                    source={{ uri: fixStorageUrl(photo.url) || '' }}
                    style={styles.photoImage}
                  />
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error }]}
                    onPress={() => handleDeleteExistingPhoto(photo)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* New Photos (not yet uploaded) */}
              {newPhotos.map((photo, index) => (
                <View key={`new-${index}`} style={styles.photoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.newBadgeText}>{t('activityForm.new')}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.error }]}
                    onPress={() => handleRemoveNewPhoto(index)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Photo Button */}
              {canAddMorePhotos && (
                <TouchableOpacity
                  style={[styles.addPhotoButton, { borderColor: colors.border }]}
                  onPress={handleAddPhoto}
                >
                  <Ionicons name="add" size={32} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                    {t('activityForm.addPhoto')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isUploadingPhoto && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>
                  {t('activityForm.uploadingPhotos')}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <Button
            title={t('activityForm.updateButton')}
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  switchContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  // Photo section styles
  sectionContainer: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: fontSize.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  newBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  uploadingText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
});
