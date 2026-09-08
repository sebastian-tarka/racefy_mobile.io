import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { borderRadius, fontSize, spacing, msFont } from '../theme';
import { formatDistance, formatTotalTime } from '../utils/formatters';
import { getSportIcon } from '../utils/sportIcon';
import { getSportTile, hasSportTile } from '../config/sportTiles';
import type { PlannedRoute, SportType } from '../types/api';

interface RouteCardProps {
  route: PlannedRoute;
  /**
   * The route's sport, when the caller can resolve it. `/routes` does not always
   * embed `sport_type`, and without it every card falls back to the generic
   * icon — which is why the library used to be a wall of identical tiles.
   */
  sport?: Pick<SportType, 'slug' | 'name'> | null;
  onPress?: () => void;
}

function RouteCardBase({ route, sport, onPress }: RouteCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const profileLabel = route.profile === 'cycling' ? t('routes.cycling') : t('routes.walking');
  const routeSport = sport ?? route.sport_type ?? null;
  const tile = routeSport && hasSportTile(routeSport) ? getSportTile(routeSport, isDark) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Card style={styles.card} noPadding>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
            {tile ? (
              <>
                <Image
                  source={tile}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={120}
                />
                <LinearGradient
                  colors={
                    isDark
                      ? ['transparent', 'rgba(0,0,0,0.8)']
                      : ['transparent', 'rgba(255,255,255,0.92)']
                  }
                  locations={[0.5, 1]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <Text
                  style={[
                    styles.profileBadge,
                    styles.profileBadgeOverArt,
                    { color: isDark ? '#ffffff' : '#0A1A14' },
                  ]}
                  numberOfLines={1}
                >
                  {profileLabel}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name={getSportIcon(routeSport?.name)} size={28} color={colors.primary} />
                <Text style={[styles.profileBadge, { color: colors.primary }]}>{profileLabel}</Text>
              </>
            )}
          </View>

          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {route.title}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="resize-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {formatDistance(route.distance)}
                </Text>
              </View>

              <View style={styles.stat}>
                <Ionicons name="trending-up-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {route.elevation_gain}m
                </Text>
              </View>

              <View style={styles.stat}>
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  ~{formatTotalTime(route.estimated_duration)}
                </Text>
              </View>
            </View>

            {route.description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                {route.description}
              </Text>
            ) : null}
          </View>
        </View>

        {(route.is_public || route.usage_count > 0) && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {route.is_public && (
              <View style={styles.footerBadge}>
                <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {t('routes.public')}
                </Text>
              </View>
            )}
            {route.usage_count > 0 && (
              <View style={styles.footerBadge}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {t('routes.usedTimes', { count: route.usage_count })}
                </Text>
              </View>
            )}
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
  content: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  profileBadge: {
    fontSize: msFont(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  profileBadgeOverArt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    marginTop: 0,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
  },
  description: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.xs,
  },
});

// Memoized: these cards render inside FlatLists; React.memo skips re-renders when props are unchanged.
export const RouteCard = React.memo(RouteCardBase);
