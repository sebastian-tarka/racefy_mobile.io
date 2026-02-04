import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../hooks/useTheme';
import { spacing, borderRadius, fontSize, fontWeight } from '../../../../theme';
import { fixStorageUrl } from '../../../../config/api';
import type { EventWithLatestCommentary } from '../../../../types/api';

interface LiveEventsCardProps {
  events: EventWithLatestCommentary[];
  onPress?: (eventId: number) => void;
}

// Sport type emoji mapping
const SPORT_EMOJI: Record<string, string> = {
  'running': '🏃',
  'cycling': '🚴',
  'swimming': '🏊',
  'skiing': '⛷️',
  'hiking': '🥾',
  'walking': '🚶',
  'gym': '💪',
  'yoga': '🧘',
  'other': '🏋️',
};

/**
 * LiveEventsCard - Displays currently live events
 *
 * Shows a card with gradient background, live badge, and event information.
 * Randomly selects one event from the provided array to display.
 * Designed according to the home screen mockup.
 */
export const LiveEventsCard: React.FC<LiveEventsCardProps> = ({ events, onPress }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Pulsing animation for LIVE badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Randomly select one event to display
  const selectedEvent = useMemo(() => {
    if (events.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * events.length);
    return events[randomIndex];
  }, [events]);

  // Don't render if no events
  if (!selectedEvent) return null;

  // Get sport emoji
  const sportSlug = selectedEvent.sport_type?.slug || 'other';
  const sportEmoji = SPORT_EMOJI[sportSlug] || SPORT_EMOJI.other;

  // Get event title from post
  const eventTitle = selectedEvent.post?.title || t('home.liveEvents.title');

  // Get participants count
  const participantsCount = selectedEvent.active_participants_count || 0;

  // Check if event has cover image (use fixStorageUrl like in other components)
  const coverImageUrl = fixStorageUrl(selectedEvent.cover_image_url);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => onPress?.(selectedEvent.id)}
      activeOpacity={0.8}
    >
      {/* Top section with cover image or gradient */}
      <View style={styles.imageSection}>
        {coverImageUrl ? (
          <>
            {/* Cover image - positioned from top */}
            <Image
              source={{ uri: coverImageUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            {/* Dark gradient overlay for readability */}
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientOverlay}
            />

            {/* LIVE badge with pulse animation */}
            <Animated.View style={[styles.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
          </>
        ) : (
          <LinearGradient
            colors={['#1e3a5f', '#0c1929', '#1a2e45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Decorative radial overlay */}
            <View style={styles.decorativeOverlay} />

            {/* LIVE badge with pulse animation */}
            <Animated.View style={[styles.liveBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>

            {/* Sport emoji icon - centered when no cover image */}
            <Text style={styles.emoji}>{sportEmoji}</Text>
          </LinearGradient>
        )}
      </View>

      {/* Content section */}
      <View style={styles.content}>
        <Text style={[styles.statusLabel, { color: colors.error }]}>
          {t('home.liveEvents.happeningNow').toUpperCase()}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {eventTitle}
        </Text>
        <Text style={[styles.participants, { color: colors.textMuted }]}>
          {t('home.liveEvents.participants', { count: participantsCount })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  imageSection: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  decorativeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f43f5e',
    letterSpacing: 0.5,
  },
  emoji: {
    fontSize: 32,
  },
  emojiCorner: {
    position: 'absolute',
    top: 12,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSmall: {
    fontSize: 24,
  },
  content: {
    padding: 14,
    paddingHorizontal: 18,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  participants: {
    fontSize: fontSize.sm,
  },
});
