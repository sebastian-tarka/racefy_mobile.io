import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ImageViewer } from '../../../components/ImageViewer';
import { useTheme } from '../../../hooks/useTheme';
import { logger } from '../../../services/logger';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { MessageAttachment } from '../../../types/api';
import { formatFileSize } from '../../../utils/fileSize';

interface Props {
  attachments: MessageAttachment[];
  /** Own bubbles are primary-colored: file tiles switch to a translucent white. */
  isOwn: boolean;
}

/** Width of a lone photo; a grid of several photos uses two columns of GRID_CELL. */
const SINGLE_WIDTH = 220;
const GRID_CELL = 108;
const GRID_GAP = 4;
const MIN_ASPECT = 0.6;
const MAX_ASPECT = 1.6;

/**
 * Photos (thumbnails → full-screen viewer) and files (name + size → system browser)
 * inside a chat bubble. Signed URLs come fresh with every message fetch, so nothing is
 * cached beyond what the image component does on its own.
 */
export function MessageAttachments({ attachments, isOwn }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  const images = attachments.filter((a) => a.kind === 'image');
  const files = attachments.filter((a) => a.kind !== 'image');

  const openFile = async (file: MessageAttachment) => {
    try {
      await Linking.openURL(file.url);
    } catch (error) {
      logger.warn('general', 'Failed to open chat attachment', { id: file.id, error });
      Alert.alert('', t('messaging.openFileFailed'));
    }
  };

  const renderImage = (image: MessageAttachment, size: { width: number; height: number }) => (
    <TouchableOpacity
      key={image.id}
      testID={`attachment-image-${image.id}`}
      accessibilityRole="imagebutton"
      accessibilityLabel={t('messaging.photo')}
      activeOpacity={0.85}
      onPress={() => setExpanded(image.large_url ?? image.url)}
    >
      <Image
        source={{ uri: image.thumb_url ?? image.url }}
        style={[styles.image, size, { backgroundColor: colors.borderLight }]}
        contentFit="cover"
        transition={150}
      />
    </TouchableOpacity>
  );

  const tileBackground = isOwn ? 'rgba(255, 255, 255, 0.18)' : colors.background;
  const tileText = isOwn ? colors.white : colors.textPrimary;
  const tileMeta = isOwn ? 'rgba(255, 255, 255, 0.75)' : colors.textMuted;

  return (
    <View style={styles.container}>
      {images.length === 1 && renderImage(images[0], singleImageSize(images[0]))}
      {images.length > 1 && (
        <View style={styles.grid}>
          {images.map((image) => renderImage(image, { width: GRID_CELL, height: GRID_CELL }))}
        </View>
      )}
      {files.map((file) => (
        <TouchableOpacity
          key={file.id}
          testID={`attachment-file-${file.id}`}
          accessibilityRole="button"
          accessibilityLabel={file.name}
          style={[styles.fileTile, { backgroundColor: tileBackground }]}
          onPress={() => void openFile(file)}
          activeOpacity={0.7}
        >
          <Ionicons name={fileIcon(file)} size={26} color={tileText} />
          <View style={styles.fileText}>
            <Text style={[styles.fileName, { color: tileText }]} numberOfLines={2}>
              {file.name}
            </Text>
            <Text style={[styles.fileMeta, { color: tileMeta }]}>{formatFileSize(file.size)}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={tileMeta} />
        </TouchableOpacity>
      ))}
      {expanded !== null && (
        <ImageViewer uri={expanded} visible onClose={() => setExpanded(null)} />
      )}
    </View>
  );
}

function singleImageSize(image: MessageAttachment): { width: number; height: number } {
  const ratio =
    image.width && image.height
      ? Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, image.width / image.height))
      : 1;
  return { width: SINGLE_WIDTH, height: Math.round(SINGLE_WIDTH / ratio) };
}

function fileIcon(file: MessageAttachment): React.ComponentProps<typeof Ionicons>['name'] {
  if (file.mime_type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return 'document-text-outline';
  }
  if (file.mime_type.includes('gpx') || /\.gpx$/i.test(file.name)) {
    return 'map-outline';
  }
  return 'document-outline';
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    width: GRID_CELL * 2 + GRID_GAP,
  },
  image: {
    borderRadius: borderRadius.md,
  },
  fileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: SINGLE_WIDTH,
  },
  fileText: {
    flex: 1,
  },
  fileName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  fileMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
