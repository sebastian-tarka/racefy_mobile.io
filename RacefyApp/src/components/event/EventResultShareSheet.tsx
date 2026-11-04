import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SheetModal } from '../SheetModal';
import { SegmentedControl } from '../SegmentedControl';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { fixStorageUrl } from '../../config/api';
import { borderRadius, fontSize, spacing } from '../../theme';
import { shareImageFile } from '../../utils/share';
import { getErrorMessage } from '../../utils/errors';
import { pickVariant } from '../../utils/imageVariants';
import type {
  EventResultShare,
  EventResultShareBackground,
  EventResultShareFormat,
  Photo,
} from '../../types/api';

interface EventResultShareSheetProps {
  visible: boolean;
  onClose: () => void;
  eventId: number;
  /** The finished activity — its photos are the "my photo" backgrounds. */
  activityId: number | null;
  /** Results not finalized yet: a note that the card may still change. */
  provisional: boolean;
}

type ShowKey = 'place' | 'pace' | 'badges' | 'bib';

const FORMAT_RATIO: Record<EventResultShareFormat, number> = {
  story: 9 / 16,
  square: 1,
  social: 1.91,
};

/**
 * "Udostępnij wynik" (design 5e): the server draws the result card; this sheet picks
 * format, background and fields, previews it, and hands the file to the system share
 * sheet (Instagram Stories included) or copies the public link when there is one.
 */
export function EventResultShareSheet({
  visible,
  onClose,
  eventId,
  activityId,
  provisional,
}: EventResultShareSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [format, setFormat] = useState<EventResultShareFormat>('story');
  const [background, setBackground] = useState<EventResultShareBackground>('route');
  const [photoId, setPhotoId] = useState<number | null>(null);
  const [show, setShow] = useState<Record<ShowKey, boolean>>({
    place: true,
    pace: true,
    badges: true,
    bib: false,
  });

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [card, setCard] = useState<EventResultShare | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'copy' | null>(null);
  const [copied, setCopied] = useState(false);
  const requestSeq = useRef(0);

  // Photos of the result activity — only needed for the "my photo" background.
  useEffect(() => {
    if (!visible || activityId == null) return;
    let cancelled = false;
    api
      .getActivity(activityId)
      .then((activity) => {
        if (cancelled) return;
        const list = activity.photos ?? [];
        setPhotos(list);
        setPhotoId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((err) => logger.warn('api', 'Result share: photos unavailable', { error: err }));
    return () => {
      cancelled = true;
    };
  }, [visible, activityId]);

  // Regenerate on every option change; the last request wins.
  useEffect(() => {
    if (!visible) return;
    if (background === 'photo' && photoId == null) return;
    const seq = ++requestSeq.current;
    setIsGenerating(true);
    setError(null);
    api
      .createEventResultShare(eventId, {
        format,
        background,
        ...(background === 'photo' && photoId != null ? { photo_id: photoId } : {}),
        show,
      })
      .then((result) => {
        if (seq !== requestSeq.current) return;
        setCard(result);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        logger.error('api', 'Result share generation failed', { eventId, error: err });
        setError(getErrorMessage(err) || t('resultShare.error'));
      })
      .finally(() => {
        if (seq === requestSeq.current) setIsGenerating(false);
      });
  }, [visible, eventId, format, background, photoId, show, t]);

  const toggle = useCallback((key: ShowKey) => {
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleShare = useCallback(async () => {
    if (!card) return;
    setBusy('share');
    try {
      const ok = await shareImageFile({
        imageUrl: card.image,
        title: card.title,
        message: [card.description, card.share_url].filter(Boolean).join('\n\n'),
      });
      if (!ok) setError(t('resultShare.error'));
    } catch (err) {
      setError(getErrorMessage(err) || t('resultShare.error'));
    } finally {
      setBusy(null);
    }
  }, [card, t]);

  const handleCopyLink = useCallback(async () => {
    if (!card?.share_url) return;
    setBusy('copy');
    try {
      await Clipboard.setStringAsync(card.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(null);
    }
  }, [card]);

  const previewUrl = card ? fixStorageUrl(card.image) : null;
  const previewRatio = FORMAT_RATIO[card?.format ?? format];
  const previewHeight = format === 'story' ? 300 : format === 'square' ? 220 : 160;

  const formatOptions = useMemo(
    () => [
      { value: 'story' as const, label: t('resultShare.formats.story') },
      { value: 'square' as const, label: t('resultShare.formats.square') },
      { value: 'social' as const, label: t('resultShare.formats.social') },
    ],
    [t],
  );
  const backgroundOptions = useMemo(
    () =>
      [
        { value: 'route' as const, label: t('resultShare.backgrounds.route') },
        ...(photos.length > 0
          ? [{ value: 'photo' as const, label: t('resultShare.backgrounds.photo') }]
          : []),
        { value: 'plain' as const, label: t('resultShare.backgrounds.plain') },
      ] as { value: EventResultShareBackground; label: string }[],
    [t, photos.length],
  );

  const fields: { key: ShowKey; label: string }[] = [
    { key: 'place', label: t('resultShare.fields.place') },
    { key: 'pace', label: t('resultShare.fields.pace') },
    { key: 'badges', label: t('resultShare.fields.badges') },
    { key: 'bib', label: t('resultShare.fields.bib') },
  ];

  return (
    <SheetModal visible={visible} onClose={onClose} style={styles.sheet}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('resultShare.title')}</Text>

        {/* Preview */}
        <View
          style={[styles.preview, { backgroundColor: colors.background, height: previewHeight }]}
        >
          {previewUrl ? (
            <Image
              source={{ uri: previewUrl }}
              style={[styles.previewImage, { aspectRatio: previewRatio }]}
              contentFit="contain"
              transition={150}
              accessibilityLabel={card?.title}
            />
          ) : null}
          {isGenerating ? (
            <View style={[styles.previewOverlay, { backgroundColor: colors.overlayStrong }]}>
              <ActivityIndicator color={colors.onPrimary} />
              <Text style={[styles.overlayText, { color: colors.onPrimary }]}>
                {t('resultShare.generating')}
              </Text>
            </View>
          ) : null}
          {!isGenerating && error && !previewUrl ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}
        </View>
        {provisional ? (
          <Text style={[styles.note, { color: colors.warning }]}>
            {t('resultShare.provisional')}
          </Text>
        ) : null}
        {!isGenerating && error && previewUrl ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        ) : null}

        {/* Format */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t('resultShare.format').toUpperCase()}
        </Text>
        <SegmentedControl options={formatOptions} value={format} onChange={setFormat} compact />

        {/* Background */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t('resultShare.background').toUpperCase()}
        </Text>
        <SegmentedControl
          options={backgroundOptions}
          value={background}
          onChange={setBackground}
          compact
        />
        {background === 'photo' && photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
          >
            {photos.map((photo) => {
              const selected = photo.id === photoId;
              const uri = fixStorageUrl(pickVariant(photo.variants, ['thumb', 'small'], photo.url));
              return (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setPhotoId(photo.id)}
                  activeOpacity={0.8}
                  style={[styles.thumb, { borderColor: selected ? colors.primary : 'transparent' }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`result-share-photo-${photo.id}`}
                >
                  <Image
                    source={{ uri: uri ?? undefined }}
                    style={styles.thumbImage}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Fields */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {t('resultShare.show').toUpperCase()}
        </Text>
        <View style={[styles.fields, { borderColor: colors.border }]}>
          {fields.map((field, index) => (
            <View
              key={field.key}
              style={[
                styles.fieldRow,
                index > 0 && {
                  borderTopColor: colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{field.label}</Text>
              <Switch
                value={show[field.key]}
                onValueChange={() => toggle(field.key)}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={show[field.key] ? colors.primary : colors.white}
                testID={`result-share-toggle-${field.key}`}
              />
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.primary }, !card && styles.disabled]}
            onPress={handleShare}
            disabled={!card || busy != null}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="result-share-share"
          >
            {busy === 'share' ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color={colors.onPrimary} />
                <Text style={[styles.primaryText, { color: colors.onPrimary }]}>
                  {t('resultShare.shareNative')}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.secondary,
              { borderColor: colors.border, backgroundColor: colors.cardBackground },
              !card?.share_url && styles.disabled,
            ]}
            onPress={handleCopyLink}
            disabled={!card?.share_url || busy != null}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="result-share-copy"
          >
            <Ionicons
              name={copied ? 'checkmark' : 'link'}
              size={18}
              color={copied ? colors.success : colors.textPrimary}
            />
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              {copied ? t('share.copied') : t('resultShare.copyLink')}
            </Text>
          </TouchableOpacity>
          {card && !card.share_url ? (
            <Text style={[styles.note, { color: colors.textMuted }]}>
              {t('resultShare.noLink')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '92%',
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  preview: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    height: '100%',
    maxWidth: '100%',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  overlayText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  note: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  thumbs: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  fields: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.md,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  primary: {
    height: 50,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondary: {
    height: 46,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
