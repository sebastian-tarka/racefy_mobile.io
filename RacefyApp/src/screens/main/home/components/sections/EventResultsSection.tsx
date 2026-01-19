import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../../../../theme';
import type { HomeSection } from '../../../../../types/api';

interface EventResultsSectionProps {
  section: HomeSection;
  onPress?: () => void;
  onEventPress?: (eventId: number) => void;
}

/**
 * Get medal color based on position
 */
function getMedalColor(position: number): string {
  switch (position) {
    case 1: return '#FFD700'; // Gold
    case 2: return '#C0C0C0'; // Silver
    case 3: return '#CD7F32'; // Bronze
    default: return '#9ca3af';
  }
}

/**
 * Event Results section component.
 * Shows results from a recently completed event.
 */
export function EventResultsSection({ section, onPress, onEventPress }: EventResultsSectionProps) {
  const { colors } = useTheme();

  const results = section.results;

  if (!results?.event) {
    return null;
  }

  const handlePress = () => {
    if (onEventPress) {
      onEventPress(results.event.id);
    } else {
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
          <Ionicons name="trophy" size={24} color={colors.warning} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {section.title}
          </Text>
          <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={1}>
            {results.event.title}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>

      {results.top_participants && results.top_participants.length > 0 && (
        <View style={[styles.podium, { borderTopColor: colors.border }]}>
          {results.top_participants.slice(0, 3).map((participant) => (
            <View key={participant.position} style={styles.podiumItem}>
              <View style={[styles.positionBadge, { backgroundColor: getMedalColor(participant.position) + '30' }]}>
                <Text style={[styles.positionText, { color: getMedalColor(participant.position) }]}>
                  {participant.position}
                </Text>
              </View>
              {participant.user.avatar_url ? (
                <Image source={{ uri: participant.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                  <Ionicons name="person" size={14} color={colors.textSecondary} />
                </View>
              )}
              <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
                {participant.user.name}
              </Text>
              {participant.distance_km && (
                <Text style={[styles.stats, { color: colors.textSecondary }]}>
                  {participant.distance_km.toFixed(1)} km
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {section.cta && (
        <View style={[styles.ctaContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.ctaText, { color: colors.primary }]}>{section.cta}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  eventName: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  positionText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  stats: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  ctaContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  ctaText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
