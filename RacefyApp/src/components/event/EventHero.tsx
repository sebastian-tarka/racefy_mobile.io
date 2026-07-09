import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Badge } from '../Badge';
import { useTheme } from '../../hooks/useTheme';
import { getSportIcon } from '../../utils/sportIcon';
import { borderRadius, fontSize, spacing } from '../../theme';
import { pickEventCoverUrl } from './eventFormat';
import type { Event } from '../../types/api';

interface EventHeroProps {
  event: Event;
  onBack: () => void;
  onShare: () => void;
  onEdit?: () => void;
  /** Height of the cover area. */
  height?: number;
}

/**
 * Cover hero for the event detail screen: cover image with a legibility gradient,
 * floating back / share / edit controls, status badge, sport·difficulty pill,
 * title and location — matching the mobile event mockups.
 */
export function EventHero({ event, onBack, onShare, onEdit, height = 300 }: EventHeroProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const coverUrl = pickEventCoverUrl(event);
  const title = event.post?.title || t('eventDetail.untitled');
  const sportName = event.sport_type?.name;
  const difficultyLabel = t(`difficulty.${event.difficulty}`);

  return (
    <View style={[styles.container, { height, backgroundColor: colors.border }]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.primaryLight + '20' }]}>
          <Ionicons name={getSportIcon(sportName)} size={72} color={colors.primary} />
        </View>
      )}

      {/* Legibility gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating controls */}
      <View style={[styles.controlsRow, { top: Math.max(insets.top + spacing.xs, spacing.md) }]}>
        <TouchableOpacity style={styles.controlButton} onPress={onBack} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.controlsRight}>
          {onEdit && (
            <TouchableOpacity style={styles.controlButton} onPress={onEdit} hitSlop={HIT_SLOP}>
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlButton} onPress={onShare} hitSlop={HIT_SLOP}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom content */}
      <View style={styles.bottom}>
        <View style={styles.badgeRow}>
          <Badge label={t(`eventStatus.${event.status}`, event.status)} variant={event.status} />
          {(sportName || difficultyLabel) && (
            <View style={styles.sportPill}>
              <Ionicons name={getSportIcon(sportName)} size={13} color="#fff" />
              <Text style={styles.sportPillText} numberOfLines={1}>
                {[sportName, difficultyLabel].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {event.location_name ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottom: {
    padding: spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    maxWidth: '60%',
  },
  sportPillText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});
