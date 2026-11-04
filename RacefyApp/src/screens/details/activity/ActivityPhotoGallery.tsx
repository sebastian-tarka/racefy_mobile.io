import React, { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components';
import { fixStorageUrl } from '../../../config/api';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { Activity } from '../../../types/api';
import { PHOTO_LADDER, pickFullSizeUrl, pickVariantForWidth } from '../../../utils/imageVariants';

type Photo = NonNullable<Activity['photos']>[number];

const THUMB_SIZE = 120;

/**
 * Thumbnails in a row, and a full-screen pager opened on the tapped one.
 *
 * Thumbnails load the `small` variant, the pager `xlarge`/`large` — and only the pages
 * next to the visible one, so opening a 20-photo activity no longer decodes 20 originals.
 */
export function ActivityPhotoGallery({ photos }: { photos: Photo[] }) {
  // Read live: a frozen module-level width would desync the pager's index from
  // its scroll offset if the window resizes (foldable, split-screen).
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const pagerRef = useRef<FlatList<Photo>>(null);

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
    if (newIndex !== selectedPhotoIndex) setSelectedPhotoIndex(newIndex);
  };

  return (
    <>
      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t('activityDetail.photos')} ({photos.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoGallery}
          >
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={photo.id}
                onPress={() => setSelectedPhotoIndex(index)}
                activeOpacity={0.8}
                testID={`activity-photo-${photo.id}`}
              >
                <Image
                  source={{
                    uri:
                      fixStorageUrl(
                        pickVariantForWidth(photo.variants, THUMB_SIZE, PHOTO_LADDER, photo.url),
                      ) || '',
                  }}
                  style={[styles.photoThumbnail, { backgroundColor: colors.border }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Fullscreen Photo Modal */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedPhotoIndex !== null && (
            <>
              <FlatList
                ref={pagerRef}
                data={photos}
                keyExtractor={(photo) => String(photo.id)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={selectedPhotoIndex}
                getItemLayout={(_, index) => ({
                  length: windowWidth,
                  offset: windowWidth * index,
                  index,
                })}
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                windowSize={3}
                onMomentumScrollEnd={onPagerScrollEnd}
                renderItem={({ item: photo }) => (
                  <View style={[styles.modalImageContainer, { width: windowWidth }]}>
                    <Image
                      source={{
                        uri: fixStorageUrl(pickFullSizeUrl(photo.variants, photo.url)) || '',
                      }}
                      style={{ width: windowWidth, height: windowWidth }}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  </View>
                )}
              />

              {/* Photo counter */}
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {selectedPhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  photoGallery: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoThumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
  },
  section: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
});
