import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import {format} from 'date-fns';
import {enUS, es, pl} from 'date-fns/locale';
import {useTranslation} from 'react-i18next';
import {AutoDisplayImage} from './AutoDisplayImage';
import {ImageViewer} from './ImageViewer';
import {ImageGallery} from './ImageGallery';
import {useTheme} from '../hooks/useTheme';
import {useImageAccentColor} from '../hooks/useImageAccentColor';
import {fixStorageUrl} from '../config/api';
import {useImageGallery} from './FeedCard.utils';
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

export function ChallengeBody({ post, onEventPress }: { post: Post; onEventPress?: () => void }) {
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

  const accentColor = useImageAccentColor(coverUrl, colors.primary);

  const sportName = event.sport_type?.name;
  const dateRange = `${format(new Date(event.starts_at), 'MMM d', { locale: dateFnsLocale })} — ${format(new Date(event.ends_at), 'MMM d', { locale: dateFnsLocale })}`;
  const statusLabel = t(`feed.challengeStatus.${event.status}`, event.status.toUpperCase());

  const statusColor = event.status === 'upcoming' ? colors.info
    : event.status === 'ongoing' ? colors.primary
    : colors.textMuted;

  return (
    <>
      {/* Hero image section */}
      <TouchableOpacity
        style={chStyles.heroContainer}
        onPress={onEventPress}
        activeOpacity={0.9}
        disabled={!onEventPress}
      >
        {coverUrl ? (
          <AutoDisplayImage
            imageUrl={coverUrl}
            onExpand={() => imageUrls.length > 1 ? openGallery(0) : setExpandedImage(coverUrl)}
            previewHeight={200}
          />
        ) : (
          <View style={[chStyles.placeholderCover, { backgroundColor: '#F59E0B' + '20' }]}>
            <Ionicons name="flame" size={48} color="#F59E0B" />
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={chStyles.heroGradient}
          pointerEvents="none"
        />

        {/* Sport type badge */}
        {sportName && (
          <View style={chStyles.sportBadge}>
            <Text style={chStyles.sportBadgeText}>{sportName.toUpperCase()}</Text>
          </View>
        )}

        {/* Title + date on gradient */}
        <View style={chStyles.heroOverlayContent}>
          <Text style={chStyles.heroTitle} numberOfLines={2}>
            {post.title || event.location_name}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Date range + status row */}
      <View style={chStyles.infoRow}>
        <View style={chStyles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[chStyles.dateText, { color: colors.textPrimary }]}>{dateRange}</Text>
        </View>
        <View style={[chStyles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Text style={[chStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Join Challenge button */}
      <View style={chStyles.ctaRow}>
        <TouchableOpacity
          style={[chStyles.joinButton, { backgroundColor: accentColor }]}
          onPress={onEventPress}
          activeOpacity={0.8}
        >
          <Text style={chStyles.joinButtonText}>{t('feed.joinChallenge', 'JOIN CHALLENGE')}</Text>
        </TouchableOpacity>
      </View>

      <GalleryModals {...{ galleryVisible, setGalleryVisible, galleryIndex, imageUrls, expandedImage, setExpandedImage }} />
    </>
  );
}

const chStyles = StyleSheet.create({
  heroContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeholderCover: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  sportBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    zIndex: 2,
  },
  sportBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroOverlayContent: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.md,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ctaRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  joinButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});