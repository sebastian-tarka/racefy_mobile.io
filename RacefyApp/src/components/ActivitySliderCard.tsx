import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Avatar } from './Avatar';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { fixStorageUrl } from '../config/api';
import { spacing, fontSize, borderRadius } from '../theme';
import type { Activity } from '../types/api';

interface ActivitySliderCardProps {
  activity: Activity;
  onPress?: () => void;
  isAuthenticated?: boolean;
}

// Sport-themed color palettes
const sportThemes: Record<string, { gradient: [string, string]; accent: string; icon: keyof typeof Ionicons.glyphMap }> = {
  running: {
    gradient: ['#10b981', '#059669'],
    accent: '#34d399',
    icon: 'walk',
  },
  cycling: {
    gradient: ['#3b82f6', '#1d4ed8'],
    accent: '#60a5fa',
    icon: 'bicycle',
  },
  swimming: {
    gradient: ['#06b6d4', '#0891b2'],
    accent: '#22d3ee',
    icon: 'water',
  },
  gym: {
    gradient: ['#f97316', '#ea580c'],
    accent: '#fb923c',
    icon: 'barbell',
  },
  yoga: {
    gradient: ['#a855f7', '#7c3aed'],
    accent: '#c084fc',
    icon: 'body',
  },
  hiking: {
    gradient: ['#84cc16', '#65a30d'],
    accent: '#a3e635',
    icon: 'trail-sign',
  },
  default: {
    gradient: ['#6366f1', '#4f46e5'],
    accent: '#818cf8',
    icon: 'fitness',
  },
};

const getSportTheme = (sportName?: string) => {
  if (!sportName) return sportThemes.default;
  const name = sportName.toLowerCase();

  if (name.includes('run') || name.includes('jog')) return sportThemes.running;
  if (name.includes('cycl') || name.includes('bike')) return sportThemes.cycling;
  if (name.includes('swim')) return sportThemes.swimming;
  if (name.includes('gym') || name.includes('weight') || name.includes('fitness')) return sportThemes.gym;
  if (name.includes('yoga') || name.includes('pilates')) return sportThemes.yoga;
  if (name.includes('hik') || name.includes('walk') || name.includes('trek')) return sportThemes.hiking;

  return sportThemes.default;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};


export function ActivitySliderCard({
  activity,
  onPress,
  isAuthenticated = true,
}: ActivitySliderCardProps) {
  const { colors, isDark } = useTheme();
  const { getDistanceValue, getDistanceUnit, getSmallDistanceUnit, formatPaceFromDistanceTime, getPaceUnit } = useUnits();
  const sportTheme = getSportTheme(activity.sport_type?.name);

  // Get background image: prioritize first photo, then route map
  // Use fixStorageUrl to handle relative URLs and localhost issues
  const rawBackgroundImage = activity.photos?.[0]?.url || activity.route_map_url || null;
  const backgroundImage = fixStorageUrl(rawBackgroundImage);
  const hasBackgroundImage = !!backgroundImage;

  const renderContent = () => (
    <View style={styles.content}>
      {/* Header with sport icon and user */}
      <View style={styles.header}>
        <View style={[
          styles.sportBadge,
          hasBackgroundImage && { backgroundColor: sportTheme.gradient[0] }
        ]}>
          <Ionicons name={sportTheme.icon} size={18} color="#fff" />
        </View>

        {activity.user && (
          <View style={styles.userBadge}>
            <Avatar
              uri={activity.user.avatar}
              name={activity.user.name}
              size="sm"
            />
          </View>
        )}
      </View>

      {/* Main stats - hero display */}
      <View style={styles.heroStats}>
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>
            {activity.distance >= 1000 ? getDistanceValue(activity.distance).toFixed(1) : Math.round(activity.distance).toString()}
          </Text>
          <Text style={styles.mainStatUnit}>
            {activity.distance >= 1000 ? getDistanceUnit() : getSmallDistanceUnit()}
          </Text>
        </View>
      </View>

      {/* Secondary stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{formatDuration(activity.duration)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.statText}>{formatPaceFromDistanceTime(activity.distance, activity.duration)} {getPaceUnit()}</Text>
        </View>
      </View>

      {/* Bottom section with title and sport */}
      <View style={styles.footer}>
        <Text style={styles.title} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={styles.sportName}>
          {activity.sport_type?.name || 'Activity'}
        </Text>

        {activity.user && (
          <Text style={styles.userName} numberOfLines={1}>
            by {activity.user.name}
          </Text>
        )}
      </View>
    </View>
  );

  const renderLockedBadge = () => (
    <View style={styles.lockedBadge}>
      <BlurView intensity={30} style={styles.lockedBadgeBlur}>
        <View style={styles.lockedBadgeContent}>
          <Ionicons name="lock-closed" size={14} color="#fff" />
          <Text style={styles.lockedBadgeText}>Sign in</Text>
        </View>
      </BlurView>
    </View>
  );

  // Inner content with gradient overlay
  const renderCardInner = () => (
    <LinearGradient
      colors={
        hasBackgroundImage
          ? ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']
          : sportTheme.gradient
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative elements - only show when no background image */}
      {!hasBackgroundImage && (
        <>
          <View style={[styles.decorCircle, styles.decorCircle1, { backgroundColor: sportTheme.accent }]} />
          <View style={[styles.decorCircle, styles.decorCircle2, { backgroundColor: sportTheme.accent }]} />
        </>
      )}

      {renderContent()}

      {/* Show locked badge for non-authenticated users */}
      {!isAuthenticated && renderLockedBadge()}
    </LinearGradient>
  );

  // Card with or without background image
  const cardContent = hasBackgroundImage ? (
    <ImageBackground
      source={{ uri: backgroundImage }}
      style={styles.imageBackground}
      imageStyle={styles.imageBackgroundImage}
    >
      {renderCardInner()}
    </ImageBackground>
  ) : (
    renderCardInner()
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
      style={[styles.container, { shadowColor: sportTheme.gradient[1] }]}
    >
      {/* Sport-colored accent bar at top when there's a background image */}
      {hasBackgroundImage && (
        <View style={[styles.sportAccentBar, { backgroundColor: sportTheme.gradient[0] }]} />
      )}
      {cardContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sportAccentBar: {
    height: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageBackground: {
    minHeight: 200,
  },
  imageBackgroundImage: {
    borderRadius: borderRadius.xl,
  },
  gradient: {
    padding: spacing.lg,
    minHeight: 200,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sportBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBadge: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  heroStats: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -1,
  },
  mainStatUnit: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginLeft: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  statText: {
    fontSize: fontSize.sm,
    color: '#fff',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  footer: {
    marginTop: 'auto',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  sportName: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  userName: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.xs,
  },
  // Decorative circles
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.15,
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -30,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -20,
  },
  // Locked badge for non-authenticated users (bottom right)
  lockedBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  lockedBadgeBlur: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  lockedBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  lockedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#fff',
    marginLeft: spacing.xs,
  },
});
