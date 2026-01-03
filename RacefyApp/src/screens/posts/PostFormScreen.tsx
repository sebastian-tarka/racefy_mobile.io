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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Input,
  Button,
  ScreenHeader,
} from '../../components';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Post } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'PostForm'>;

export function PostFormScreen({ navigation, route }: Props) {
  const { postId } = route.params || {};
  const isEditMode = !!postId;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
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
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = t('postForm.validation.contentRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (isEditMode && postId) {
        await api.updatePost(postId, {
          content: content.trim(),
          title: title.trim() || undefined,
        });
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
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
