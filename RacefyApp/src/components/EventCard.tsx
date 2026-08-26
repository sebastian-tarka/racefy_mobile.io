import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { borderRadius, fontSize, spacing, msFont } from '../theme';
import { getSportIcon } from '../utils/sportIcon';
import type { Event } from '../types/api';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

function DateBadge({ event }: { event: Event }) {
  const { colors } = useTheme();
  const start = new Date(event.starts_at);

  if (event.status === 'ongoing') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.error + '18' }]}>
        <Ionicons name="radio" size={20} color={colors.error} />
        <Text style={[styles.badgeSub, { color: colors.error }]}>LIVE</Text>
      </View>
    );
  }
  if (event.status === 'completed' || event.status === 'cancelled') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.borderLight }]}>
        <Ionicons
          name={event.status === 'cancelled' ? 'close' : 'checkmark'}
          size={22}
          color={colors.textMuted}
        />
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.primaryLight + '22' }]}>
      <Text style={[styles.badgeMonth, { color: colors.primary }]}>
        {format(start, 'MMM').toUpperCase()}
      </Text>
      <Text style={[styles.badgeDay, { color: colors.primary }]}>{format(start, 'd')}</Text>
    </View>
  );
}

function EventCardBase({ event, onPress }: EventCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort } = useUnits();

  const distanceMeters = event.distance ?? event.route?.distance ?? null;
  const meta = [
    event.location_name,
    distanceMeters != null ? formatDistanceShort(distanceMeters) : null,
    t('eventCard.going', {
      count: event.participants_count,
      defaultValue: `${event.participants_count} going`,
    }),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <DateBadge event={event} />
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {event.post?.title || t('eventDetail.untitled')}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons
                name={getSportIcon(event.sport_type?.name)}
                size={13}
                color={colors.primary}
              />
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {meta}
              </Text>
            </View>
          </View>
          {event.is_registered && (
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 52,
    minHeight: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMonth: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeDay: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: -2,
  },
  badgeSub: {
    fontSize: msFont(9),
    fontWeight: '800',
    marginTop: 1,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    fontSize: fontSize.sm,
    flex: 1,
  },
});

// Memoized: these cards render inside FlatLists; React.memo skips re-renders when props are unchanged.
export const EventCard = React.memo(EventCardBase);
