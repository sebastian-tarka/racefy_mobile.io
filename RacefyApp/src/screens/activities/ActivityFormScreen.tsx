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
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { Activity } from '../../types/api';

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
      console.error('Failed to fetch activity:', error);
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
        await api.updateActivity(activityId, {
          title: title.trim(),
          description: description.trim() || undefined,
          is_private: isPrivate,
        });
        Alert.alert(t('common.success'), t('activityForm.updateSuccess'));
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save activity:', error);
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
});
