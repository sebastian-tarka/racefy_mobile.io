import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ImageViewer } from '../ImageViewer';
import { useTheme } from '../../hooks/useTheme';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { Photo } from '../../types/api';

const MAX_THUMBS = 3;

/** Section title + up to 3 photo thumbnails; tap opens a fullscreen viewer. */
export function EventGallery({ photos }: { photos: Photo[] | undefined }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  if (!photos || photos.length === 0) return null;

  const thumbs = photos.slice(0, MAX_THUMBS);
  const remaining = photos.length - thumbs.length;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textMuted }]}>
        {t('eventDetail.gallery', 'Gallery').toUpperCase()}
      </Text>
      <View style={styles.row}>
        {thumbs.map((photo, index) => {
          const uri = fixStorageUrl(photo.url) || undefined;
          const showOverlay = index === MAX_THUMBS - 1 && remaining > 0;
          return (
            <TouchableOpacity
              key={photo.id}
              style={[styles.thumb, { backgroundColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => uri && setViewerUri(uri)}
            >
              {uri && <Image source={{ uri }} style={styles.image} resizeMode="cover" />}
              {showOverlay && (
                <View style={styles.overlay}>
                  <Text style={styles.overlayText}>+{remaining}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ImageViewer
        uri={viewerUri ?? ''}
        visible={viewerUri !== null}
        onClose={() => setViewerUri(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
});
