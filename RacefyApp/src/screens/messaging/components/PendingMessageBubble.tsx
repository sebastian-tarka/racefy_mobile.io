import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { PendingMessage } from '../../../hooks/useMessages';

interface Props {
  message: PendingMessage;
  onRetry: (localId: string) => void;
  onDiscard: (localId: string) => void;
}

const THUMB = 72;

/**
 * An own bubble for a message whose files are still uploading (progress bar) or failed
 * (error text with Retry / Discard). Local previews, since the server has nothing yet.
 */
export function PendingMessageBubble({ message, onRetry, onDiscard }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const failed = message.status === 'failed';
  const images = message.attachments.filter((a) => a.kind === 'image');
  const files = message.attachments.filter((a) => a.kind !== 'image');

  return (
    <View style={styles.row} testID={`pending-message-${message.localId}`}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: failed ? colors.cardBackground : colors.primary },
          failed && { borderWidth: 1, borderColor: colors.error },
        ]}
      >
        {images.length > 0 && (
          <View style={styles.grid}>
            {images.map((image) => (
              <Image
                key={image.localId}
                source={{ uri: image.uri }}
                style={[styles.thumb, { opacity: failed ? 0.6 : 0.85 }]}
                contentFit="cover"
              />
            ))}
          </View>
        )}
        {files.map((file) => (
          <View key={file.localId} style={styles.fileRow}>
            <Ionicons
              name="document-outline"
              size={18}
              color={failed ? colors.textPrimary : colors.white}
            />
            <Text
              style={[styles.fileName, { color: failed ? colors.textPrimary : colors.white }]}
              numberOfLines={1}
            >
              {file.name}
            </Text>
          </View>
        ))}
        {message.content ? (
          <Text style={[styles.caption, { color: failed ? colors.textPrimary : colors.white }]}>
            {message.content}
          </Text>
        ) : null}

        {failed ? (
          <View style={styles.failedBlock}>
            <Text style={[styles.error, { color: colors.error }]}>{message.error}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onDiscard(message.localId)}
                style={styles.action}
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {t('messaging.attachments.discard')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRetry(message.localId)}
                style={styles.action}
                accessibilityRole="button"
              >
                <Text style={[styles.actionText, { color: colors.primary, fontWeight: '700' }]}>
                  {t('messaging.attachments.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.progressBlock}>
            <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor: colors.white,
                    width: `${Math.round(message.progress * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.sending, { color: 'rgba(255,255,255,0.85)' }]}>
              {t('messaging.attachments.sending')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginBottom: spacing.sm,
  },
  bubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: spacing.xs,
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: THUMB * 3 + 8,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: borderRadius.md,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fileName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  caption: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  progressBlock: {
    marginTop: spacing.xs,
    gap: 4,
  },
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
  },
  sending: {
    fontSize: fontSize.xs,
    alignSelf: 'flex-end',
  },
  failedBlock: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  error: {
    fontSize: fontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  action: {
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
  },
});
