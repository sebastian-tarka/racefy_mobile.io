import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useNavigationState } from '@react-navigation/native';
import { ScreenContainer, ScreenHeader, Input, Button } from '../../components';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { collectDeviceInfo } from '../../services/api/feedback';
import { logger } from '../../services/logger';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { FeedbackType, FeedbackPriority } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedbackForm'>;

const FEEDBACK_TYPES: { type: FeedbackType; icon: string; color: string }[] = [
  { type: 'bug', icon: 'bug-outline', color: '#EF4444' },
  { type: 'feature_request', icon: 'bulb-outline', color: '#A855F7' },
  { type: 'feedback', icon: 'chatbubble-outline', color: '#3B82F6' },
];

const PRIORITIES: FeedbackPriority[] = ['low', 'medium', 'high', 'critical'];

const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  low: '#6B7280',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
};

interface Attachment {
  uri: string;
  name: string;
  type: string;
}

function useCurrentRoute(): string {
  const state = useNavigationState((s) => s);
  function getActiveRoute(navState: any): string {
    if (!navState?.routes) return '/';
    const route = navState.routes[navState.index];
    if (route.state) return getActiveRoute(route.state);
    return `/${route.name}`;
  }
  return getActiveRoute(state);
}

export function FeedbackFormScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currentRoute = useCurrentRoute();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) newErrors.subject = t('feedback.form.subjectRequired');
    if (!description.trim()) newErrors.description = t('feedback.form.descriptionRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPhoto = useCallback(async () => {
    if (attachments.length >= 5) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - attachments.length,
    });

    if (!result.canceled && result.assets) {
      const newAttachments: Attachment[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    }
  }, [attachments.length]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const deviceInfo = await collectDeviceInfo();

      await api.createFeedback({
        type: feedbackType,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        ...deviceInfo,
        url: currentRoute,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      Alert.alert(t('feedback.messages.submitted'));
      navigation.goBack();
    } catch (err: any) {
      logger.error('api', 'Failed to submit feedback', { error: err });
      if (err?.status === 429) {
        Alert.alert(t('feedback.messages.rateLimited'));
      } else if (err?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(err.errors)) {
          fieldErrors[key] = Array.isArray(messages) ? messages[0] : String(messages);
        }
        setErrors(fieldErrors);
      } else {
        Alert.alert(t('feedback.messages.submitFailed'), err?.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('feedback.form.title')}
        showBack
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type selector */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('feedback.form.type')}</Text>
          <View style={styles.typeSelector}>
            {FEEDBACK_TYPES.map(({ type, icon, color }) => {
              const isActive = feedbackType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isActive ? color + '15' : colors.cardBackground,
                      borderColor: isActive ? color : colors.border,
                    },
                  ]}
                  onPress={() => setFeedbackType(type)}
                >
                  <Ionicons name={icon as any} size={24} color={isActive ? color : colors.textSecondary} />
                  <Text
                    style={[
                      styles.typeLabel,
                      { color: isActive ? color : colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {t(`feedback.types.${type}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subject */}
          <Input
            label={t('feedback.form.subject')}
            placeholder={t('feedback.form.subjectPlaceholder')}
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              if (errors.subject) setErrors((e) => ({ ...e, subject: '' }));
            }}
            error={errors.subject}
            maxLength={255}
            editable={!isSubmitting}
          />

          {/* Description */}
          <Input
            label={t('feedback.form.description')}
            placeholder={t('feedback.form.descriptionPlaceholder')}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) setErrors((e) => ({ ...e, description: '' }));
            }}
            error={errors.description}
            multiline
            numberOfLines={5}
            maxLength={5000}
            editable={!isSubmitting}
          />

          {/* Priority */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('feedback.form.priority')}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const isActive = priority === p;
              const pColor = PRIORITY_COLORS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: isActive ? pColor + '20' : colors.cardBackground,
                      borderColor: isActive ? pColor : colors.border,
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: isActive ? pColor : colors.textSecondary },
                    ]}
                  >
                    {t(`feedback.priorities.${p}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Attachments */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{t('feedback.form.attachments')}</Text>
          <View style={styles.attachmentsRow}>
            {attachments.length < 5 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                onPress={handleAddPhoto}
              >
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                  {t('feedback.form.addPhoto')}
                </Text>
              </TouchableOpacity>
            )}
            {attachments.map((att, index) => (
              <View key={att.uri} style={styles.attachmentThumb}>
                <Image source={{ uri: att.uri }} style={styles.thumbImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveAttachment(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('feedback.form.maxAttachments')}
          </Text>

          {/* Device info hint */}
          <View style={[styles.deviceInfoHint, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.deviceInfoText, { color: colors.textSecondary }]}>
              {t('feedback.form.deviceInfoHint')}
            </Text>
          </View>

          {/* Submit */}
          <Button
            title={isSubmitting ? t('feedback.form.submitting') : t('feedback.form.submit')}
            onPress={handleSubmit}
            disabled={isSubmitting || !subject.trim() || !description.trim()}
            loading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg || 12,
    borderWidth: 1.5,
    minHeight: 80,
    gap: spacing.xs,
  },
  typeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md || 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md || 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: fontSize.xs,
  },
  attachmentThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md || 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  deviceInfoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md || 8,
    marginBottom: spacing.lg,
  },
  deviceInfoText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
});
