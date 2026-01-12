import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card } from '../../../../components';
import { useTheme } from '../../../../hooks/useTheme';
import { api } from '../../../../services/api';
import { logger } from '../../../../services/logger';
import { spacing, fontSize, borderRadius } from '../../../../theme';
import type { Event } from '../../../../types/api';

interface UpcomingEventsPreviewProps {
  onEventPress: (eventId: number) => void;
  onViewAllPress: () => void;
  limit?: number;
}

export function UpcomingEventsPreview({
  onEventPress,
  onViewAllPress,
  limit = 3,
}: UpcomingEventsPreviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.getEvents({ status: 'upcoming', per_page: limit });
        setEvents(response.data);
      } catch (error) {
        logger.debug('api', 'Failed to fetch upcoming events', { error });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [limit]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.upcomingEvents')}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return null;
  }

  const getDifficultyColor = (difficulty: Event['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.warning;
      case 'advanced':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('home.upcomingEvents')}</Text>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{t('common.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {events.map((event) => (
        <TouchableOpacity
          key={event.id}
          onPress={() => onEventPress(event.id)}
          activeOpacity={0.8}
        >
          <Card style={styles.eventCard}>
            <View style={[styles.eventDateBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.eventDateDay, { color: colors.white }]}>
                {format(new Date(event.starts_at), 'd')}
              </Text>
              <Text style={[styles.eventDateMonth, { color: colors.white }]}>
                {format(new Date(event.starts_at), 'MMM')}
              </Text>
            </View>
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {event.post?.title || t('eventDetail.untitled')}
              </Text>
              <View style={styles.eventMeta}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.eventLocation, { color: colors.textMuted }]} numberOfLines={1}>
                  {event.location_name}
                </Text>
              </View>
              <View style={styles.eventTags}>
                <View style={[styles.tag, { backgroundColor: getDifficultyColor(event.difficulty) + '20' }]}>
                  <Text style={[styles.tagText, { color: getDifficultyColor(event.difficulty) }]}>
                    {t(`difficulty.${event.difficulty}`)}
                  </Text>
                </View>
                {event.sport_type && (
                  <View style={[styles.tag, { backgroundColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>{event.sport_type.name}</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventDateBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  eventDateDay: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  eventDateMonth: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: fontSize.sm,
    marginLeft: 4,
    flex: 1,
  },
  eventTags: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
});
