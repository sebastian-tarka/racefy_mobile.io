import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { BoostButton } from './BoostButton';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { useSportTypes } from '../hooks/useSportTypes';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  showUser?: boolean;
  /** Show engagement buttons (like, boost, comments) */
  showEngagement?: boolean;
}

export function ActivityCard({
  activity,
  onPress,
  showUser = false,
  showEngagement = false,
}: ActivityCardProps) {
  const { colors } = useTheme();
  const { formatDistance, formatPaceWithUnit, formatElevation } = useUnits();
  const { getSportById } = useSportTypes();
  const formattedDate = format(new Date(activity.started_at), 'MMM d, yyyy');

  // Engagement state
  const [boostsCount, setBoostsCount] = useState(activity.boosts_count || 0);
  const [isBoosted, setIsBoosted] = useState(activity.is_boosted || false);
  const [showAdditionalStats, setShowAdditionalStats] = useState(false);

  // Animation values
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Check if there are additional stats to show
  const hasAdditionalStats =
    (activity.elevation_gain != null && activity.elevation_gain > 0) ||
    (activity.calories != null && activity.calories > 0);

  // Animate expansion/collapse
  useEffect(() => {
    if (showAdditionalStats) {
      // Expand
      Animated.parallel([
        Animated.spring(animatedHeight, {
          toValue: 1,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Collapse
      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [showAdditionalStats]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getSportIcon = (): keyof typeof Ionicons.glyphMap => {
    if (activity.sport_type?.id) {
      const sportType = getSportById(activity.sport_type.id);
      if (sportType?.icon) {
        return sportType.icon;
      }
    }
    // Fallback to default if sport type not found
    return 'fitness-outline';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Card style={styles.card}>
        {showUser && activity.user && (
          <View style={[styles.userHeader, { borderBottomColor: colors.borderLight }]}>
            <Avatar uri={activity.user.avatar} name={activity.user.name} size="sm" />
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>{activity.user.name}</Text>
              <Text style={[styles.userDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
            </View>
          </View>
        )}

        <View style={styles.header}>
          <View style={[styles.sportBadge, { backgroundColor: colors.primaryLight + '20' }]}>
            <Ionicons name={getSportIcon()} size={20} color={colors.primary} />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {activity.title}
              </Text>
              {/* Privacy Indicator */}
              <View style={[
                styles.privacyBadge,
                { backgroundColor: activity.is_private ? colors.textMuted + '15' : colors.primary + '15' }
              ]}>
                <Ionicons
                  name={activity.is_private ? 'lock-closed' : 'globe-outline'}
                  size={12}
                  color={activity.is_private ? colors.textMuted : colors.primary}
                />
              </View>
            </View>
            <Text style={[styles.sportName, { color: colors.textSecondary }]}>
              {activity.sport_type?.name || 'Activity'}{!showUser ? ` · ${formattedDate}` : ''}
            </Text>
          </View>
        </View>

        {/* Route Map Preview */}
        {activity.route_map_url && (
          <View style={styles.mapContainer}>
            <Image
              source={{ uri: fixStorageUrl(activity.route_map_url) ?? undefined }}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={[styles.mapOverlay, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="map-outline" size={16} color={colors.primary} />
              <Text style={[styles.mapText, { color: colors.primary }]}>View Route</Text>
            </View>
          </View>
        )}

        {/* Main Stats Row (Max 3) */}
        <View style={[styles.statsContainer, { borderTopColor: colors.borderLight }]}>
          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDistance(activity.distance)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDuration(activity.duration)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatPaceWithUnit(activity.distance, activity.duration)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pace</Text>
          </View>
        </View>

        {/* Toggle Button for Additional Stats */}
        {hasAdditionalStats && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowAdditionalStats(!showAdditionalStats)}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Additional Stats Row (Collapsible with Animation) */}
        {hasAdditionalStats && (
          <Animated.View
            style={[
              styles.additionalStatsWrapper,
              {
                maxHeight: animatedHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 100],
                }),
                opacity: animatedOpacity,
              },
            ]}
          >
            <View style={[styles.additionalStatsContainer, { borderTopColor: colors.borderLight }]}>
              {activity.elevation_gain != null && activity.elevation_gain > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="trending-up" size={18} color={colors.textSecondary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatElevation(activity.elevation_gain!)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Elevation</Text>
                </View>
              )}

              {activity.elevation_gain != null && activity.elevation_gain > 0 &&
               activity.calories != null && activity.calories > 0 && (
                <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
              )}

              {activity.calories != null && activity.calories > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="flame-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{activity.calories}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Calories</Text>
                </View>
              )}

              {/* Empty placeholder to center-align when only 1 or 2 stats */}
              <View style={styles.statItem} />
            </View>
          </Animated.View>
        )}

        {/* Engagement bar */}
        {showEngagement && (
          <View style={[styles.engagementBar, { borderTopColor: colors.borderLight }]}>
            {/* Likes */}
            <View style={styles.engagementItem}>
              <Ionicons
                name={activity.is_liked ? 'heart' : 'heart-outline'}
                size={18}
                color={activity.is_liked ? '#E53E3E' : colors.textMuted}
              />
              <Text style={[styles.engagementText, { color: colors.textMuted }]}>
                {activity.likes_count || 0}
              </Text>
            </View>

            {/* Boosts */}
            <BoostButton
              activityId={activity.id}
              initialBoostsCount={boostsCount}
              initialIsBoosted={isBoosted}
              disabled={activity.is_owner}
              compact
              onBoostChange={(newIsBoosted, newCount) => {
                setIsBoosted(newIsBoosted);
                setBoostsCount(newCount);
              }}
            />

            {/* Comments */}
            <View style={styles.engagementItem}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.engagementText, { color: colors.textMuted }]}>
                {activity.comments_count || 0}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  userInfo: {
    marginLeft: spacing.sm,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  userDate: {
    fontSize: fontSize.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sportBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  privacyBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportName: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  mapContainer: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs / 2,
  },
  mapText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  additionalStatsWrapper: {
    overflow: 'hidden',
  },
  additionalStatsContainer: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    marginTop: spacing.sm,
  },
  engagementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  engagementText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
});
