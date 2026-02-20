import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { Badge } from './Badge';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { fixStorageUrl } from '../config/api';
import { getSportIcon } from '../utils/sportIcon';
import type { Event } from '../types/api';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const formattedDate = format(new Date(event.starts_at), 'MMM d, h:mm a');

  // Use cover_image_url as primary, fallback to first photo
  const imageUrl = fixStorageUrl(event.cover_image_url || event.post?.photos?.[0]?.url);

  const spotsText =
    event.max_participants !== null
      ? `${event.participants_count}/${event.max_participants}`
      : `${event.participants_count}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Card style={styles.card} noPadding>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.iconPlaceholder, { backgroundColor: colors.primaryLight + '20' }]}>
                <Ionicons
                  name={getSportIcon(event.sport_type?.name)}
                  size={32}
                  color={colors.primary}
                />
              </View>
            )}
          </View>

          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {event.post?.title || t('eventDetail.untitled')}
            </Text>

            <View style={styles.detailRow}>
              <Ionicons
                name="fitness-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {event.sport_type?.name || t('eventDetail.sport')}
              </Text>
              <Text style={[styles.separator, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {t(`difficulty.${event.difficulty}`)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.location_name}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="people-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {spotsText} {t('eventDetail.participants').toLowerCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Badge label={event.status} variant={event.status} />
          {event.is_registered && (
            <View style={styles.registeredBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.registeredText, { color: colors.primary }]}>
                {t('eventDetail.registered')}
              </Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    flex: 1,
  },
  separator: {
    marginHorizontal: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registeredText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
});
