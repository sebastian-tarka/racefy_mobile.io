import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface LiveEventSectionProps {
  section: HomeSection;
  onPress?: () => void;
  onEventPress?: (eventId: number) => void;
}

/**
 * Live Event section component.
 * Shows a single live event that is currently happening.
 */
export function LiveEventSection({ section, onPress, onEventPress }: LiveEventSectionProps) {
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
        <View style={[styles.overlay, { backgroundColor: 'rgba(220,38,38,0.85)' }]}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>NA ŻYWO</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

            {section.message && (
              <Text style={styles.message} numberOfLines={2}>{section.message}</Text>
            )}

            <View style={styles.meta}>
              {event.participants_count !== undefined && (
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.metaText}>{event.participants_count} uczestników</Text>
                </View>
              )}
              {event.location && (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
                </View>
              )}
            </View>
          </View>

          {section.cta && (
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{section.cta}</Text>
              <Ionicons name="arrow-forward" size={16} color="#dc2626" />
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
    height: 180,
  },
  imageBackground: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  image: {
    borderRadius: borderRadius.lg,
    opacity: 0.3,
  },
  overlay: {
    flex: 1,
    padding: spacing.lg,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  eventTitle: {
    color: '#ffffff',
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  ctaText: {
    color: '#dc2626',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
