import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components';
import { fixStorageUrl } from '../../../config/api';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { Activity } from '../../../types/api';

type Photo = NonNullable<Activity['photos']>[number];

/**
 * Thumbnails in a row, and a full-screen pager opened on the tapped one.
 */
export function ActivityPhotoGallery({ photos }: { photos: Photo[] }) {
  // Read live: a frozen module-level width would desync the pager's index from
  // its scroll offset if the window resizes (foldable, split-screen).
  const { width: windowWidth } = useWindowDimensions();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

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
              >
                <Image
                  source={{ uri: fixStorageUrl(photo.url) || '' }}
                  style={styles.photoThumbnail}
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
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: selectedPhotoIndex * windowWidth, y: 0 }}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
                  setSelectedPhotoIndex(newIndex);
                }}
              >
                {photos.map((photo) => (
                  <View key={photo.id} style={[styles.modalImageContainer, { width: windowWidth }]}>
                    <Image
                      source={{ uri: fixStorageUrl(photo.url) || '' }}
                      style={{ width: windowWidth, height: windowWidth }}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

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
    width: 120,
    height: 120,
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
