import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {format} from 'date-fns';
import {enUS, es, pl} from 'date-fns/locale';
import {useTranslation} from 'react-i18next';
import {AutoDisplayImage} from './AutoDisplayImage';
import {ExpandableContent, PostMedia} from './FeedCard.Media';
import {ImageViewer} from './ImageViewer';
import {ImageGallery} from './ImageGallery';
import {useTheme} from '../hooks/useTheme';
import {fixStorageUrl} from '../config/api';
import {styles, useImageGallery} from './FeedCard.utils';
import {borderRadius, fontSize, spacing} from '../theme';
import type {Post} from '../types/api';

function GalleryModals({ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }: any) {
  return (
    <>
      {galleryVisible && imageUrls.length > 0 && (
        <ImageGallery images={imageUrls} initialIndex={galleryIndex} visible={galleryVisible} onClose={() => setGalleryVisible(false)} />
      )}
      {expandedImage && (
        <ImageViewer uri={expandedImage} visible onClose={() => setExpandedImage(null)} />
      )}
    </>
  );
}

export function EventBody({ post, onEventPress }: { post: Post; onEventPress?: () => void }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { expandedImage, setExpandedImage, galleryVisible, setGalleryVisible, galleryIndex, openGallery } = useImageGallery();
  const event = post.event;
  if (!event) return null;

  const dateFnsLocale = i18n.language === 'pl' ? pl : i18n.language === 'es' ? es : enUS;

  const { coverUrl, imageUrls } = useMemo(() => {
    const cover = event.cover_image_url ? fixStorageUrl(event.cover_image_url) : null;
    const urls: string[] = [];
    if (cover) urls.push(cover);
    (post.photos || []).forEach(p => {
      const url = fixStorageUrl(p.url);
      if (url) urls.push(url);
    });
    return { coverUrl: cover, imageUrls: urls };
  }, [event.cover_image_url, post.photos]);

  const isNew = event.status === 'upcoming';
  const formattedDate = format(new Date(event.starts_at), 'MMM d', { locale: dateFnsLocale });

  return (
    <>
      {/* Cover image with gradient overlay — hero layout */}
      {coverUrl ? (
        <TouchableOpacity
          style={[evStyles.heroContainer, styles.fullBleedMedia]}
          onPress={onEventPress}
          activeOpacity={0.9}
          disabled={!onEventPress}
        >
          <AutoDisplayImage
            imageUrl={coverUrl}
            onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(coverUrl)}
            previewHeight={220}
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)']}
            style={evStyles.heroGradient}
            pointerEvents="none"
          />
          {/* "NEW EVENT" badge */}
          {isNew && (
            <View style={evStyles.newBadge}>
              <Text style={evStyles.newBadgeText}>{t('feed.newEvent', 'NEW EVENT')}</Text>
            </View>
          )}
          {/* Title on gradient */}
          <View style={evStyles.heroOverlayContent}>
            <Text style={evStyles.heroTitle} numberOfLines={2}>
              {post.title || event.location_name}
            </Text>
            <View style={evStyles.heroMeta}>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={evStyles.heroMetaText}>{formattedDate}</Text>
              {event.location_name && (
                <>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" style={{ marginLeft: 10 }} />
                  <Text style={evStyles.heroMetaText} numberOfLines={1}>{event.location_name}</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        /* No cover — text-only layout */
        <View style={styles.bodyPadding}>
          {isNew && (
            <View style={[evStyles.newBadgeInline, { backgroundColor: colors.info + '15' }]}>
              <Text style={[evStyles.newBadgeInlineText, { color: colors.info }]}>{t('feed.newEvent', 'NEW EVENT')}</Text>
            </View>
          )}
          {post.title && <Text style={[styles.bodyTitle, { color: colors.textPrimary }]}>{post.title}</Text>}
        </View>
      )}

      {/* Info bar — participants + view details */}
      <View style={[evStyles.infoBar, { borderTopColor: colors.border }]}>
        <View style={evStyles.infoLeft}>
          <View style={evStyles.infoItem}>
            <Ionicons name="calendar-outline" size={15} color={colors.info} />
            <Text style={[evStyles.infoText, { color: colors.textPrimary }]}>
              {format(new Date(event.starts_at), 'EEE, MMM d, yyyy', { locale: dateFnsLocale })}
            </Text>
          </View>
          {event.location_name && (
            <View style={evStyles.infoItem}>
              <Ionicons name="location-outline" size={15} color={colors.info} />
              <Text style={[evStyles.infoText, { color: colors.textPrimary }]} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Participant count + View Details row */}
      <View style={[evStyles.bottomRow, { borderTopColor: colors.border }]}>
        <View style={evStyles.participantsBadge}>
          <Ionicons name="people" size={16} color={colors.info} />
          <Text style={[evStyles.participantsText, { color: colors.textSecondary }]}>
            {t('feed.participants', { count: event.participants_count })}
          </Text>
        </View>
        {onEventPress && (
          <TouchableOpacity onPress={onEventPress} style={[evStyles.viewDetailsBtn, { backgroundColor: colors.info }]}>
            <Text style={evStyles.viewDetailsBtnText}>{t('feed.viewDetails')}</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content text if any */}
      {post.content && (
        <View style={styles.bodyPadding}>
          <ExpandableContent text={post.content} type="event" mentions={post.mentions} />
        </View>
      )}

      {/* Supplementary photos */}
      {(post.photos?.length ?? 0) > 0 && !coverUrl && (
        <View style={styles.bodyPadding}>
          <PostMedia post={post} heroMode={false} />
        </View>
      )}

      <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
    </>
  );
}

const evStyles = StyleSheet.create({
  // Hero cover
  heroContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroOverlayContent: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },

  // NEW EVENT badge
  newBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: '#3b82f6',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    zIndex: 2,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  newBadgeInline: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  newBadgeInlineText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Info bar
  infoBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  infoLeft: {
    gap: spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    flex: 1,
  },

  // Bottom row
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  participantsText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  viewDetailsBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});