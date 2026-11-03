import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import { formatFileSize } from '../../../utils/fileSize';
import type { LocalAttachment } from '../../../utils/chatAttachments';

interface Props {
  attachments: LocalAttachment[];
  onRemove: (localId: string) => void;
}

const THUMB = 64;

/** Files picked but not yet sent, shown above the composer with a remove button each. */
export function AttachmentPreviewStrip({ attachments, onRemove }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={[
        styles.strip,
        { backgroundColor: colors.cardBackground, borderTopColor: colors.border },
      ]}
      contentContainerStyle={styles.content}
    >
      {attachments.map((file) => (
        <View key={file.localId} style={styles.item} testID={`pending-attachment-${file.localId}`}>
          {file.kind === 'image' ? (
            <Image
              source={{ uri: file.uri }}
              style={[styles.thumb, { backgroundColor: colors.borderLight }]}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.fileTile,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name={/\.pdf$/i.test(file.name) ? 'document-text-outline' : 'map-outline'}
                size={22}
                color={colors.textPrimary}
              />
              <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                {file.name}
              </Text>
              {file.size !== null && (
                <Text style={[styles.fileSize, { color: colors.textMuted }]}>
                  {formatFileSize(file.size)}
                </Text>
              )}
            </View>
          )}
          <TouchableOpacity
            style={[styles.remove, { backgroundColor: colors.error }]}
            onPress={() => onRemove(file.localId)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('messaging.attachments.remove')}
          >
            <Ionicons name="close" size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderTopWidth: 1,
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  item: {
    position: 'relative',
    paddingTop: 6,
    paddingRight: 6,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: borderRadius.md,
  },
  fileTile: {
    width: THUMB * 2,
    height: THUMB,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.xs,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  fileSize: {
    fontSize: fontSize.xs,
  },
  remove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
