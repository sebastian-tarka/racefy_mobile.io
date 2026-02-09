import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { AutoDisplayImage } from './AutoDisplayImage';
import { ExpandableContent, PostMedia } from './FeedCard.Media';
import { ImageViewer } from './ImageViewer';
import { ImageGallery } from './ImageGallery';
import { useTheme } from '../hooks/useTheme';
import { fixStorageUrl } from '../config/api';
import { useImageGallery, styles } from './FeedCard.utils';
import type { Post } from '../types/api';

function GalleryModals({ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }: any) {
  return (
    <>
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery images={imageUrls} initialIndex={galleryIndex} visible={galleryVisible} onClose={() => setGalleryVisible(false)} />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible={true} onClose={() => setExpandedImage(null)} />
      )}
    </>
  );
}

export function EventBody({ post, onEventPress }: { post: Post; onEventPress?: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const event = post.event;
  if (!event) return null;

  const coverUrl = event.cover_image_url ? fixStorageUrl(event.cover_image_url) : null;
  const imageUrls: string[] = [];
  if (coverUrl) imageUrls.push(coverUrl);
  (post.photos || []).forEach(p => {
    const url = fixStorageUrl(p.url);
    if (url) imageUrls.push(url);
  });

  return (
    <>
      {/* Title with padding */}
      <View style={styles.bodyPadding}>
        {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
      </View>

      {/* Full-bleed cover image */}
      {coverUrl && (
        <View style={[styles.heroMediaContainer, styles.fullBleedMedia]}>
          <AutoDisplayImage imageUrl={coverUrl} onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(coverUrl)} previewHeight={300} />
        </View>
      )}

      {/* Content, info box, and supplementary media with padding */}
      <View style={styles.bodyPadding}>
        {post.content && <ExpandableContent text={post.content} type="event" mentions={post.mentions} />}
        <View style={[styles.infoBox, { backgroundColor: colors.infoLight, borderColor: colors.info + '30' }]}>
          <View style={styles.infoBoxRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.info} />
            <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>{format(new Date(event.starts_at), 'EEE, MMM d, yyyy h:mm a')}</Text>
          </View>
          {event.location_name && (
            <View style={styles.infoBoxRow}>
              <Ionicons name="location-outline" size={16} color={colors.info} />
              <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>{event.location_name}</Text>
            </View>
          )}
          <View style={styles.infoBoxRow}>
            <Ionicons name="people-outline" size={16} color={colors.info} />
            <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>{t('feed.participants', { count: event.participants_count })}</Text>
            {onEventPress && (
              <TouchableOpacity onPress={onEventPress} style={styles.infoBoxLink}>
                <Text style={[styles.infoBoxLinkText, { color: colors.info }]}>{t('feed.viewDetails')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <PostMedia post={post} heroMode={false} />
        <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
      </View>
    </>
  );
}