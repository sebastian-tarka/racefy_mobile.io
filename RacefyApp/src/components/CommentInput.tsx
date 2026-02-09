import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useMentions } from 'react-native-controlled-mentions';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { stripMentionsForApi } from '../utils/mentions';
import { api } from '../services/api';
import { logger } from '../services/logger';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Comment, MediaItem, MentionSearchUser, MentionSearchEvent, MentionSearchActivity } from '../types/api';

const DEBOUNCE_MS = 300;

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

  // Mention search state
  const [userResults, setUserResults] = useState<MentionSearchUser[]>([]);
  const [eventResults, setEventResults] = useState<MentionSearchEvent[]>([]);
  const [activityResults, setActivityResults] = useState<MentionSearchActivity[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { textInputProps, triggers } = useMentions({
    value: content,
    onChange: setContent,
    triggersConfig: {
      mention: {
        trigger: '@',
        textStyle: { fontWeight: '600', color: colors.primary },
        isInsertSpaceAfterMention: true,
      },
      event: {
        trigger: '#',
        textStyle: { fontWeight: '600', color: colors.info },
        isInsertSpaceAfterMention: true,
      },
      activity: {
        trigger: '!',
        textStyle: { fontWeight: '600', color: colors.ai || '#A855F7' },
        isInsertSpaceAfterMention: true,
      },
    },
  });

  // Debounced search for users
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const kw = triggers.mention.keyword?.trim();
    if (!kw || kw.length === 0) { setUserResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await api.searchMentionUsers(kw);
        setUserResults(resp.data);
      } catch { setUserResults([]); }
    }, DEBOUNCE_MS);
  }, [triggers.mention.keyword]);

  // Debounced search for events
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const kw = triggers.event.keyword?.trim();
    if (!kw || kw.length === 0) { setEventResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await api.searchMentionEvents(kw);
        setEventResults(resp.data);
      } catch { setEventResults([]); }
    }, DEBOUNCE_MS);
  }, [triggers.event.keyword]);

  // Debounced search for activities
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const kw = triggers.activity.keyword?.trim();
    if (!kw || kw.length === 0) { setActivityResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await api.searchMentionActivities(kw);
        setActivityResults(resp.data);
      } catch { setActivityResults([]); }
    }, DEBOUNCE_MS);
  }, [triggers.activity.keyword]);

  const showUsers = triggers.mention.keyword !== undefined && userResults.length > 0;
  const showEvents = triggers.event.keyword !== undefined && eventResults.length > 0;
  const showActivities = triggers.activity.keyword !== undefined && activityResults.length > 0;
  const showSuggestions = showUsers || showEvents || showActivities;

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
      await onSubmit(stripMentionsForApi(content.trim()), photo || undefined);
      setContent('');
      setPhoto(null);
      onCancelReply?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
      {/* Mention suggestions */}
      {showSuggestions && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {showUsers && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {userResults.map((item) => (
                <TouchableOpacity
                  key={`user-${item.id}`}
                  style={styles.suggestionItem}
                  onPress={() => { triggers.mention.onSelect({ id: String(item.id), name: item.name }); setUserResults([]); }}
                >
                  <Avatar uri={item.avatar} name={item.name} size="sm" />
                  <View style={styles.suggestionText}>
                    <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.suggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {showEvents && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {eventResults.map((item) => (
                <TouchableOpacity
                  key={`event-${item.id}`}
                  style={styles.suggestionItem}
                  onPress={() => { triggers.event.onSelect({ id: String(item.id), name: item.title || item.name || '' }); setEventResults([]); }}
                >
                  <View style={[styles.triggerIcon, { backgroundColor: colors.info + '18' }]}>
                    <Text style={[styles.triggerIconText, { color: colors.info }]}>#</Text>
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || item.name}</Text>
                    {item.location && <Text style={[styles.suggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {showActivities && (
            <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionList} nestedScrollEnabled>
              {activityResults.map((item) => (
                <TouchableOpacity
                  key={`activity-${item.id}`}
                  style={styles.suggestionItem}
                  onPress={() => { triggers.activity.onSelect({ id: String(item.id), name: item.title || item.name || '' }); setActivityResults([]); }}
                >
                  <View style={[styles.triggerIcon, { backgroundColor: (colors.ai || '#A855F7') + '18' }]}>
                    <Text style={[styles.triggerIconText, { color: colors.ai || '#A855F7' }]}>!</Text>
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>{item.title || item.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

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
          {...textInputProps}
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
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  suggestionName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  suggestionMeta: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  triggerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerIconText: {
    fontSize: 16,
    fontWeight: '700',
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
