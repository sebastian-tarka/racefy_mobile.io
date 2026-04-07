import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SharedPostBlock } from './SharedPostBlock';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Post } from '../types/api';

interface ReshareModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
  onSubmit: (content?: string, visibility?: string) => Promise<void>;
}

type Visibility = 'public' | 'followers' | 'private';

const MAX_CONTENT_LENGTH = 500;

export function ReshareModal({ visible, onClose, post, onSubmit }: ReshareModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(content || undefined, visibility);
      setContent('');
      setVisibility('public');
      onClose();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 409) {
        Alert.alert(t('common.error'), t('reshare.alreadyReshared'));
      } else if (status === 403) {
        Alert.alert(t('common.error'), t('reshare.cannotReshare'));
      } else {
        Alert.alert(t('common.error'), t('reshare.reshareError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('');
      setVisibility('public');
      onClose();
    }
  };

  const visibilityOptions: { key: Visibility; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'public', icon: 'earth-outline' },
    { key: 'followers', icon: 'people-outline' },
    { key: 'private', icon: 'lock-closed-outline' },
  ];

  // Build a SharedPost-like object from the Post for preview
  const previewPost = {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    visibility: post.visibility,
    created_at: post.created_at,
    user: post.user,
    photos: post.photos,
    media: post.media,
    videos: post.videos,
    activity: post.activity,
    event: post.event,
    likes_count: post.likes_count,
    comments_count: post.comments_count,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.kavFlex}
        behavior="padding"
      >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.cardBackground }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('reshare.title')}
          </Text>

          {/* Content input */}
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder={t('reshare.addComment')}
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={(text) => setContent(text.slice(0, MAX_CONTENT_LENGTH))}
              multiline
              maxLength={MAX_CONTENT_LENGTH}
              editable={!isSubmitting}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </Text>
          </View>

          {/* Visibility selector */}
          <View style={styles.visibilityRow}>
            {visibilityOptions.map(({ key, icon }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.visibilityButton,
                  {
                    borderColor: visibility === key ? '#06b6d4' : colors.border,
                    backgroundColor: visibility === key ? '#06b6d4' + '15' : 'transparent',
                  },
                ]}
                onPress={() => setVisibility(key)}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={icon}
                  size={16}
                  color={visibility === key ? '#06b6d4' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.visibilityText,
                    { color: visibility === key ? '#06b6d4' : colors.textSecondary },
                  ]}
                >
                  {t(`reshare.visibility.${key}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Post preview */}
          <SharedPostBlock sharedPost={previewPost} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#06b6d4', opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="repeat" size={18} color="#fff" />
                  <Text style={styles.submitText}>{t('reshare.reshareButton')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavFlex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    fontSize: fontSize.md,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSize.xs,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  visibilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  submitText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
