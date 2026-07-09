import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { Badge } from './Badge';
import { useTheme } from '../hooks/useTheme';
import { getSportIcon } from '../utils/sportIcon';
import { pickEventCoverUrl } from './event/eventFormat';
import { borderRadius, fontSize, spacing } from '../theme';
import type { Event } from '../types/api';

interface FeaturedEventCardProps {
  event: Event;
  onPress?: () => void;
  onRegister?: () => void;
}

/** Large hero card for the top of the events list: cover + badges + inline register. */
function FeaturedEventCardBase({ event, onPress, onRegister }: FeaturedEventCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const coverUrl = pickEventCoverUrl(event);
  const start = new Date(event.starts_at);

  const eligibility = event.registration_eligibility;
  const canRegister = (eligibility?.can_register ?? false) && !event.is_registered;
  const left = event.available_spots;

  const goingText = t('eventCard.going', {
    count: event.participants_count,
    defaultValue: `${event.participants_count} going`,
  });
  const spotsText =
    left != null && left > 0
      ? ` · ${t('eventDetail.spotsLeft', { count: left, defaultValue: `${left} spots left` })}`
      : '';

  return (
    <Card style={styles.card} noPadding>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={!onPress}>
        <View style={styles.cover}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: colors.primaryLight + '20' }]}>
              <Ionicons
                name={getSportIcon(event.sport_type?.name)}
                size={56}
                color={colors.primary}
              />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badges}>
            <View style={[styles.featuredBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.featuredText}>
                {t('events.featured', 'Featured').toUpperCase()}
              </Text>
            </View>
            <Badge label={t(`eventStatus.${event.status}`, event.status)} variant={event.status} />
          </View>
          <View style={styles.coverBottom}>
            <Text style={styles.title} numberOfLines={2}>
              {event.post?.title || t('eventDetail.untitled')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[format(start, 'EEE · d MMM yyyy'), event.location_name].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={[styles.going, { color: colors.textSecondary }]} numberOfLines={1}>
          {goingText}
          {spotsText}
        </Text>
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: canRegister ? colors.primary : colors.borderLight },
          ]}
          onPress={canRegister ? (onRegister ?? onPress) : onPress}
          activeOpacity={0.85}
        >
          <Text style={[styles.registerText, { color: canRegister ? '#fff' : colors.textPrimary }]}>
            {event.is_registered
              ? t('eventDetail.registered', 'Registered')
              : canRegister
                ? t('eventDetail.register', 'Register')
                : t('common.view', 'View')}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={canRegister ? '#fff' : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cover: {
    height: 190,
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
  badges: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featuredBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  featuredText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  coverBottom: {
    padding: spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  going: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  registerText: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});

export const FeaturedEventCard = React.memo(FeaturedEventCardBase);
