import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EventCard, LiveEventCard } from '../../../components';
import { useTheme } from '../../../hooks/useTheme';
import { useUnits } from '../../../hooks/useUnits';
import { borderRadius, fontSize, spacing } from '../../../theme';
import type { EventsOverviewData } from './useEventsOverview';

export type EventsFilter = 'all' | 'upcoming' | 'ongoing' | 'completed';

/**
 * The stat strip above the list: personal numbers on "All", the status's
 * counts on the other filters.
 */
export function EventsStatsRow({
  activeFilter,
  overview,
}: {
  activeFilter: EventsFilter;
  overview: EventsOverviewData;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistanceShort } = useUnits();
  const { eventStats, eventOverview, statsLoading } = overview;

  type StatItem = {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    value: number | string;
    label: string;
  };

  const getStatsForFilter = (filter: EventsFilter): StatItem[] => {
    const s = eventStats;
    const o = eventOverview;

    switch (filter) {
      case 'all':
        // General tab: personal overview
        return [
          {
            icon: 'checkbox',
            color: colors.success,
            value: s?.participated.joined ?? 0,
            label: t('events.stats.joined'),
          },
          {
            icon: 'trophy',
            color: colors.warning,
            value: s?.results.podiums ?? 0,
            label: t('events.stats.podiums'),
          },
          {
            icon: 'radio',
            color: colors.error,
            value: s?.participated.ongoing ?? o?.ongoing.event_count ?? 0,
            label: t('events.stats.ongoing'),
          },
          {
            icon: 'time',
            color: colors.primary,
            value: s?.participated.upcoming ?? o?.upcoming.event_count ?? 0,
            label: t('events.stats.upcoming'),
          },
        ];
      case 'ongoing':
        return [
          {
            icon: 'radio',
            color: colors.error,
            value: o?.ongoing.event_count ?? 0,
            label: t('events.stats.ongoing'),
          },
          {
            icon: 'people',
            color: colors.info || '#3b82f6',
            value: o?.ongoing.total_participants ?? 0,
            label: t('events.stats.participants'),
          },
          {
            icon: 'flag',
            color: colors.success,
            value: s?.participated.ongoing ?? 0,
            label: t('events.stats.joined'),
          },
        ];
      case 'upcoming':
        return [
          {
            icon: 'time',
            color: colors.warning,
            value: o?.upcoming.event_count ?? 0,
            label: t('events.stats.upcoming'),
          },
          {
            icon: 'people',
            color: colors.info || '#3b82f6',
            value: o?.upcoming.total_participants ?? 0,
            label: t('events.stats.participants'),
          },
          {
            icon: 'checkbox',
            color: colors.success,
            value: s?.participated.upcoming ?? 0,
            label: t('events.stats.joined'),
          },
        ];
      case 'completed':
        return [
          {
            icon: 'checkmark-done',
            color: colors.primary,
            value: s?.participated.completed ?? 0,
            label: t('events.stats.myCompleted'),
          },
          {
            icon: 'trophy',
            color: colors.warning,
            value: s?.results.podiums ?? 0,
            label: t('events.stats.podiums'),
          },
          {
            icon: 'navigate',
            color: colors.success,
            value: s ? formatDistanceShort(s.activity_totals.distance) : '0',
            label: t('events.stats.distance'),
          },
          {
            icon: 'ribbon',
            color: colors.error,
            value: s?.results.total_finishes ?? 0,
            label: t('events.stats.finishes'),
          },
        ];
    }
  };

  const stats = getStatsForFilter(activeFilter);
  return (
    <View style={[styles.overviewStatsRow, { backgroundColor: colors.cardBackground }]}>
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {index > 0 && (
            <View style={[styles.overviewStatDivider, { backgroundColor: colors.border }]} />
          )}
          <View style={styles.overviewStatItem}>
            <Ionicons name={stat.icon} size={20} color={stat.color} />
            <Text style={[styles.overviewStatValue, { color: colors.textPrimary }]}>
              {statsLoading ? '—' : stat.value}
            </Text>
            <Text style={[styles.overviewStatLabel, { color: colors.textSecondary }]}>
              {stat.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/** "All": live (compact or detailed), upcoming and completed — three each. */
export function EventsOverviewSections({
  overview,
  onOpenEvent,
  onShowAll,
}: {
  overview: EventsOverviewData;
  onOpenEvent: (eventId: number) => void;
  onShowAll: (filter: EventsFilter) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    ongoingEvents,
    upcomingEvents,
    completedEvents,
    liveEventsDetailed,
    eventOverview,
    liveViewMode,
    toggleLiveViewMode,
    fetchOverviewData,
  } = overview;

  return (
    <View style={styles.overviewContainer}>
      {/* Ongoing Events Section */}
      {ongoingEvents.length > 0 && (
        <View style={styles.overviewSection}>
          <View style={styles.overviewSectionHeader}>
            <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
              {t('events.happeningNow')}
            </Text>
            <View style={styles.overviewSectionActions}>
              <TouchableOpacity
                style={[styles.viewModeToggle, { backgroundColor: colors.borderLight }]}
                onPress={toggleLiveViewMode}
              >
                <Ionicons
                  name={liveViewMode === 'compact' ? 'expand-outline' : 'contract-outline'}
                  size={16}
                  color={liveViewMode === 'detailed' ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
              {(eventOverview?.ongoing.event_count ?? 0) > 3 && (
                <TouchableOpacity onPress={() => onShowAll('ongoing')}>
                  <Text style={[styles.overviewViewAll, { color: colors.primary }]}>
                    {t('common.viewAll')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {liveViewMode === 'detailed'
            ? // Detailed view with cover image + AI commentary (like Home screen)
              liveEventsDetailed.map((event) => (
                <LiveEventCard
                  key={event.id}
                  event={event}
                  onPress={() => onOpenEvent(event.id)}
                  onBoostComplete={() => fetchOverviewData()}
                />
              ))
            : // Compact view (default)
              ongoingEvents.map((event) => (
                <EventCard key={event.id} event={event} onPress={() => onOpenEvent(event.id)} />
              ))}
        </View>
      )}

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <View style={styles.overviewSection}>
          <View style={styles.overviewSectionHeader}>
            <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
              {t('events.upcomingEvents')}
            </Text>
            {(eventOverview?.upcoming.event_count ?? 0) > 3 && (
              <TouchableOpacity onPress={() => onShowAll('upcoming')}>
                <Text style={[styles.overviewViewAll, { color: colors.primary }]}>
                  {t('common.viewAll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => onOpenEvent(event.id)} />
          ))}
        </View>
      )}

      {/* Completed Events Section */}
      {completedEvents.length > 0 && (
        <View style={styles.overviewSection}>
          <View style={styles.overviewSectionHeader}>
            <Text style={[styles.overviewSectionTitle, { color: colors.textPrimary }]}>
              {t('events.completedEvents')}
            </Text>
            {(eventOverview?.completed.event_count ?? 0) > 3 && (
              <TouchableOpacity onPress={() => onShowAll('completed')}>
                <Text style={[styles.overviewViewAll, { color: colors.primary }]}>
                  {t('common.viewAll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {completedEvents.map((event) => (
            <EventCard key={event.id} event={event} onPress={() => onOpenEvent(event.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overviewContainer: {
    marginBottom: spacing.md,
  },
  overviewSection: {
    marginBottom: spacing.md,
  },
  overviewSectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overviewSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  overviewSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  overviewStatDivider: {
    width: 1,
    height: 40,
  },
  overviewStatItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  overviewStatLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  overviewStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  overviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  overviewViewAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  viewModeToggle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
