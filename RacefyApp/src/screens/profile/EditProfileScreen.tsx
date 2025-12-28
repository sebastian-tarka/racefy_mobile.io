import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Input, Button, Avatar } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

interface FormData {
  name: string;
  username: string;
  email: string;
  bio: string;
}

export function EditProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [backgroundUri, setBackgroundUri] = useState<string | null>(user?.background_image || null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
      });
      setAvatarUri(user.avatar || null);
      setBackgroundUri(user.background_image || null);
    }
  }, [user]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('editProfile.validation.nameRequired');
    }
    if (!formData.username.trim()) {
      newErrors.username = t('editProfile.validation.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('editProfile.validation.usernameTooShort');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('editProfile.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('editProfile.validation.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isLocalImage = (uri: string | null): boolean => {
    if (!uri) return false;
    return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
  };

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('common.error'),
        t('editProfile.permissionDenied')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('common.error'),
        t('editProfile.cameraPermissionDenied')
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const pickImage = (type: 'avatar' | 'background') => {
    const aspect: [number, number] = type === 'avatar' ? [1, 1] : [16, 9];
    const setImage = type === 'avatar' ? setAvatarUri : setBackgroundUri;

    const launchGalleryForType = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('editProfile.permissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    };

    const launchCameraForType = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('editProfile.cameraPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    };

    const title = type === 'avatar' ? t('editProfile.changeAvatar') : t('editProfile.changeBackground');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('editProfile.takePhoto'), t('editProfile.chooseFromGallery')],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            launchCameraForType();
          } else if (buttonIndex === 2) {
            launchGalleryForType();
          }
        }
      );
    } else {
      Alert.alert(
        title,
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('editProfile.takePhoto'), onPress: launchCameraForType },
          { text: t('editProfile.chooseFromGallery'), onPress: launchGalleryForType },
        ]
      );
    }
  };

  const pickAvatar = () => pickImage('avatar');
  const pickBackground = () => pickImage('background');

  const handleSave = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Upload avatar if changed
      if (avatarUri && isLocalImage(avatarUri)) {
        try {
          await api.uploadAvatar(avatarUri);
        } catch (uploadError) {
          console.error('Failed to upload avatar:', uploadError);
          Alert.alert(t('common.error'), t('editProfile.avatarUploadFailed'));
          setIsLoading(false);
          return;
        }
      }

      // Upload background image if changed
      if (backgroundUri && isLocalImage(backgroundUri)) {
        try {
          await api.uploadBackgroundImage(backgroundUri);
        } catch (uploadError) {
          console.error('Failed to upload background image:', uploadError);
          Alert.alert(t('common.error'), t('editProfile.backgroundUploadFailed'));
          setIsLoading(false);
          return;
        }
      }

      // Update profile data
      await api.updateProfile({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        bio: formData.bio || undefined,
      });

      // Refresh user data in context
      await refreshUser();

      Alert.alert(t('common.success'), t('editProfile.updateSuccess'));
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update profile:', error);

      // Handle validation errors from API
      if (error?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          apiErrors[key] = error.errors[key][0];
        });
        setErrors(apiErrors);
      } else {
        Alert.alert(t('common.error'), t('editProfile.updateFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editProfile.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Background Image Section */}
          <TouchableOpacity onPress={pickBackground} style={styles.backgroundSection}>
            {backgroundUri ? (
              <Image source={{ uri: backgroundUri }} style={styles.backgroundImage} />
            ) : (
              <View style={styles.backgroundPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.white} />
              </View>
            )}
            <View style={styles.backgroundOverlay}>
              <Ionicons name="camera" size={20} color={colors.white} />
              <Text style={styles.backgroundOverlayText}>{t('editProfile.changeBackground')}</Text>
            </View>
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formSection}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Avatar name={formData.name} size="xxl" />
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={18} color={colors.white} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar}>
              <Text style={styles.changePhotoText}>{t('editProfile.changePhoto')}</Text>
            </TouchableOpacity>
          </View>

          <Input
            label={t('auth.name')}
            placeholder={t('auth.namePlaceholder')}
            value={formData.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          <Input
            label={t('auth.username')}
            placeholder={t('auth.usernamePlaceholder')}
            value={formData.username}
            onChangeText={(text) => updateField('username', text.toLowerCase().replace(/\s/g, ''))}
            error={errors.username}
            leftIcon="at"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            error={errors.email}
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.bioContainer}>
            <Text style={styles.label}>{t('editProfile.bio')}</Text>
            <Input
              placeholder={t('editProfile.bioPlaceholder')}
              value={formData.bio}
              onChangeText={(text) => updateField('bio', text)}
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />
          </View>

          <Button
            title={t('editProfile.saveButton')}
            onPress={handleSave}
            loading={isLoading}
            style={styles.saveButton}
          />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  backgroundSection: {
    height: 150,
    backgroundColor: colors.primary,
    position: 'relative',
    marginBottom: spacing.md,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backgroundOverlayText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  changePhotoText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '500',
  },
  bioContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
