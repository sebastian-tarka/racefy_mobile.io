import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Comment, MediaItem } from '../types/api';

interface CommentInputProps {
  onSubmit: (content: string, photo?: MediaItem) => Promise<void>;
  replyingTo?: Comment | null;
  onCancelReply?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
}

export function CommentInput({
  onSubmit,
  replyingTo,
  onCancelReply,
  placeholder,
  disabled = false,
  onFocus,
}: CommentInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = (content.trim().length > 0 || photo !== null) && !isSubmitting && !disabled;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        type: 'image',
        width: asset.width,
        height: asset.height,
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      await onSubmit(content.trim(), photo || undefined);
      setContent('');
      setPhoto(null);
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

      {/* Photo preview */}
      {photo && (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
          <TouchableOpacity
            style={[styles.removePhoto, { backgroundColor: colors.error }]}
            onPress={handleRemovePhoto}
          >
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          disabled={photo !== null || disabled}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={photo !== null ? colors.textMuted : colors.primary}
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
          onFocus={onFocus}
          multiline
          maxLength={2000}
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
  photoPreview: {
    marginBottom: spacing.sm,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  photoButton: {
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
