import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../theme';
import { formatDistance, formatTotalTime } from '../utils/formatters';
import { getSportIcon } from '../utils/sportIcon';
import type { PlannedRoute } from '../types/api';

interface RouteCardProps {
  route: PlannedRoute;
  onPress?: () => void;
}

export function RouteCard({ route, onPress }: RouteCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const profileLabel = route.profile === 'cycling'
    ? t('routes.cycling')
    : t('routes.walking');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Card style={styles.card} noPadding>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
            <Ionicons
              name={getSportIcon(route.sport_type?.name)}
              size={28}
              color={colors.primary}
            />
            <Text style={[styles.profileBadge, { color: colors.primary }]}>
              {profileLabel}
            </Text>
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
  },
  profileBadge: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
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
