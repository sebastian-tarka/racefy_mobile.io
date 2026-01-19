import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface UpcomingEventSectionProps {
  section: HomeSection;
  onPress?: () => void;
  onEventPress?: (eventId: number) => void;
}

/**
 * Format date for display
 */
function formatEventDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Upcoming Event section component (singular).
 * Shows a single featured upcoming event.
 */
export function UpcomingEventSection({ section, onPress, onEventPress }: UpcomingEventSectionProps) {
  const { colors } = useTheme();

  const event = section.event;

  if (!event) {
    return null;
  }

  const handlePress = () => {
    if (onEventPress) {
      onEventPress(event.id);
    } else {
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={event.cover_image_url ? { uri: event.cover_image_url } : undefined}
        style={styles.imageBackground}
        imageStyle={styles.image}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={styles.badge}>
            <Ionicons name="calendar" size={12} color="#ffffff" />
            <Text style={styles.badgeText}>Nadchodzące</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

            <View style={styles.meta}>
              {event.start_date && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{formatEventDate(event.start_date)}</Text>
                </View>
              )}
              {event.location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
                </View>
              )}
              {event.participants_count !== undefined && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{event.participants_count} uczestników</Text>
                </View>
              )}
            </View>
          </View>

          {section.cta && (
            <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.ctaText}>{section.cta}</Text>
            </View>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    height: 200,
  },
  imageBackground: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  image: {
    borderRadius: borderRadius.lg,
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.xs,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
