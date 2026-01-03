import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { MediaItem, Comment } from '../types/api';

interface CommentInputProps {
  onSubmit: (content: string, media?: MediaItem[]) => Promise<void>;
  replyingTo?: Comment | null;
  onCancelReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CommentInput({
  onSubmit,
  replyingTo,
  onCancelReply,
  placeholder,
  disabled = false,
}: CommentInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (content.trim().length > 0 || media.length > 0) && !isSubmitting && !disabled;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 4 - media.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newMedia: MediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
        width: asset.width,
        height: asset.height,
        duration: asset.duration || undefined,
      }));
      setMedia((prev) => [...prev, ...newMedia].slice(0, 4));
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      await onSubmit(content.trim(), media.length > 0 ? media : undefined);
      setContent('');
      setMedia([]);
      onCancelReply?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {/* Reply indicator */}
      {replyingTo && (
        <View style={[styles.replyIndicator, { backgroundColor: colors.primaryLight + '20' }]}>
          <Ionicons name="arrow-undo" size={14} color={colors.primary} />
          <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={1}>
            {t('comments.replyPlaceholder', { name: replyingTo.user?.name || t('comments.unknownUser') })}
          </Text>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Media preview */}
      {media.length > 0 && (
        <ScrollView horizontal style={styles.mediaPreview} showsHorizontalScrollIndicator={false}>
          {media.map((item, index) => (
            <View key={index} style={styles.mediaItem}>
              <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play" size={16} color="#fff" />
                </View>
              )}
              <TouchableOpacity
                style={[styles.removeMedia, { backgroundColor: colors.error }]}
                onPress={() => handleRemoveMedia(index)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handlePickImage}
          disabled={media.length >= 4 || disabled}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={media.length >= 4 ? colors.textMuted : colors.primary}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          placeholder={placeholder || t('comments.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={1000}
          editable={!disabled}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={canSubmit ? '#fff' : colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  replyText: {
    flex: 1,
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  mediaPreview: {
    marginBottom: spacing.sm,
  },
  mediaItem: {
    marginRight: spacing.sm,
    position: 'relative',
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.sm,
  },
  removeMedia: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mediaButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});
