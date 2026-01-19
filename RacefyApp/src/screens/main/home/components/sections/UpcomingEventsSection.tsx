import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize } from '../../../../../theme';
import { EventCard } from '../../../../../components';
import type { HomeSection, Event } from '../../../../../types/api';

interface UpcomingEventsSectionProps {
  section: HomeSection;
  events: Event[];
  onEventPress: (eventId: number) => void;
}

/**
 * Upcoming Events section component.
 * Renders upcoming events from the home data.
 */
export function UpcomingEventsSection({
  section,
  events,
  onEventPress,
}: UpcomingEventsSectionProps) {
  const { colors } = useTheme();

  // Don't render if no events
  if (events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {section.title}
        </Text>
      </View>
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onPress={() => onEventPress(event.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
