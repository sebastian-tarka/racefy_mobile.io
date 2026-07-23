import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { LIVE_MESSAGE_MAX_LENGTH, useLiveMessaging } from '../hooks/useLiveMessaging';
import { borderRadius, fontSize, spacing } from '../theme';
import type { LiveMessage } from '../types/api';

interface Props {
  activityId: number;
  messages: LiveMessage[];
  /**
   * The athlete's `allow_live_comments`, straight from the broadcast.
   * `undefined` means an older backend that does not report it — in that case
   * the composer stays visible and is withdrawn on the first rejection.
   */
  allowComments?: boolean;
  /** Locally echo a just-sent message so it shows before the next poll. */
  onSent?: (message: LiveMessage) => void;
}

/**
 * Spectator message feed and composer.
 *
 * Messages default to PRIVATE (1:1 to the athlete) because that is the API
 * default and the safer one: a cheer meant for one person should not become
 * public by accident.
 */
export function LiveMessagePanel({ activityId, messages, allowComments, onSent }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { send, isSending, commentsDisabled, errorKey, clearError } = useLiveMessaging(activityId);
  const [text, setText] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSend = async () => {
    const sent = await send(text, isPublic);
    if (sent) {
      setText('');
      onSent?.(sent);
    }
  };

  const remaining = LIVE_MESSAGE_MAX_LENGTH - text.length;
  const canSend = text.trim().length > 0 && remaining >= 0 && !isSending;

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        // Without this, the first tap while the keyboard is open only dismisses
        // it and the send button appears unresponsive.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            {t('live.messages.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={[styles.author, { color: colors.textSecondary }]}>
              {item.user?.name ?? item.user?.username}
            </Text>
            <Text style={[styles.content, { color: colors.textPrimary }]}>{item.content}</Text>
            {item.live_visibility === 'private' && (
              <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
            )}
          </View>
        )}
      />

      {!!errorKey && (
        <TouchableOpacity onPress={clearError} style={styles.errorRow}>
          <Text style={[styles.errorText, { color: colors.error }]}>{t(errorKey)}</Text>
        </TouchableOpacity>
      )}

      {allowComments === false || commentsDisabled ? (
        // The athlete refused messages — broadcasting and accepting messages are
        // separate consents. Now that the broadcast reports `allow_live_comments`,
        // this is known before anyone types; `commentsDisabled` remains as the
        // fallback for a backend that does not send the field.
        <View
          style={[
            styles.disabledRow,
            {
              backgroundColor: colors.cardBackground,
              borderTopColor: colors.border,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.disabledText, { color: colors.textMuted }]}>
            {t('live.messages.disabled')}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.cardBackground,
              borderTopColor: colors.border,
              paddingBottom: spacing.md + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setIsPublic((v) => !v)}
            style={[styles.visibilityToggle, { borderColor: colors.border }]}
            accessibilityRole="switch"
            accessibilityState={{ checked: isPublic }}
          >
            <Ionicons
              name={isPublic ? 'earth' : 'lock-closed'}
              size={14}
              color={isPublic ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.visibilityText,
                { color: isPublic ? colors.primary : colors.textSecondary },
              ]}
            >
              {isPublic ? t('live.messages.public') : t('live.messages.private')}
            </Text>
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('live.messages.placeholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={LIVE_MESSAGE_MAX_LENGTH}
            multiline
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? colors.primary : colors.textMuted },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No border here — the composer (or the disabled notice that replaces it)
    // draws the divider, so putting one here too would double it.
    maxHeight: 220,
  },
  list: {
    maxHeight: 130,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  empty: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 3,
  },
  author: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  content: {
    flexShrink: 1,
    fontSize: fontSize.sm,
  },
  errorRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
  },
  disabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  disabledText: {
    fontSize: fontSize.sm,
  },
  // Mirrors ChatScreen's inputContainer so the two composers read as the same
  // control: top divider, row layout, bottom-aligned so a growing input pushes
  // upward rather than dragging the send button with it.
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  visibilityText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
