import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection, HomeSectionEvent } from '../../../../../types/api';

interface FriendEventsSectionProps {
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
 * Single event card
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
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {event.cover_image_url ? (
        <ImageBackground
          source={{ uri: event.cover_image_url }}
          style={styles.eventImage}
          imageStyle={styles.eventImageStyle}
        >
          <View style={styles.imageOverlay} />
        </ImageBackground>
      ) : (
        <View style={[styles.eventImage, { backgroundColor: colors.primary + '30' }]}>
          <Ionicons name="calendar" size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          {event.start_date && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatDate(event.start_date)}
              </Text>
            </View>
          )}
          {event.participants_count !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {event.participants_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Friend Events section component.
 * Shows events that friends are participating in.
 */
export function FriendEventsSection({ section, onPress, onEventPress }: FriendEventsSectionProps) {
  const { colors } = useTheme();

  const events = section.events || [];

  if (events.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="people" size={24} color={colors.info} />
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
    width: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  eventImage: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImageStyle: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  eventContent: {
    padding: spacing.md,
  },
  eventTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
  },
});
