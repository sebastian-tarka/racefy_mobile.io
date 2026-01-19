import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection, HomeSectionEvent } from '../../../../../types/api';

interface NearbyEventsSectionProps {
  section: HomeSection;
  onPress?: () => void;
  onEventPress?: (eventId: number) => void;
}

/**
 * Format date compactly
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Single event card for horizontal scroll
 */
function EventCard({
  event,
  onPress,
  colors,
}: {
  event: HomeSectionEvent;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity style={styles.eventCard} onPress={onPress} activeOpacity={0.9}>
      <ImageBackground
        source={event.cover_image_url ? { uri: event.cover_image_url } : undefined}
        style={styles.eventImage}
        imageStyle={styles.eventImageStyle}
      >
        <View style={styles.eventOverlay}>
          {event.start_date && (
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formatDate(event.start_date)}</Text>
            </View>
          )}
        </View>
      </ImageBackground>
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Nearby Events section component.
 * Shows events near the user's location in a horizontal scroll.
 */
export function NearbyEventsSection({ section, onPress, onEventPress }: NearbyEventsSectionProps) {
  const { colors } = useTheme();

  const events = section.events || [];

  if (events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="location" size={24} color={colors.success} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          {section.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {section.message}
            </Text>
          )}
        </View>
        {section.cta && (
          <TouchableOpacity onPress={onPress}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>{section.cta}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onPress={() => onEventPress?.(event.id)}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  message: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  seeAll: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: spacing.lg,
  },
  eventCard: {
    width: 160,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  eventImage: {
    height: 100,
    backgroundColor: '#1a1a2e',
  },
  eventImageStyle: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  eventOverlay: {
    flex: 1,
    padding: spacing.sm,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  dateText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  eventContent: {
    padding: spacing.sm,
  },
  eventTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
});
