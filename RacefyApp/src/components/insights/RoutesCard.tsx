import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { InsightCard } from './InsightCard';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { FavoriteRoutes, RouteFingerprint } from '../../types/insights';

interface RoutesCardProps {
  routes: FavoriteRoutes;
  fingerprints?: RouteFingerprint[];
}

export function RoutesCard({ routes, fingerprints }: RoutesCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <InsightCard title={t('insights.routes.title')} icon="map">
      <View style={[styles.uniqueBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
        <Text style={[styles.uniqueValue, { color: colors.primary }]}>
          {routes.unique_cities_count}
        </Text>
        <Text style={[styles.uniqueLabel, { color: colors.textSecondary }]}>
          {t('insights.routes.uniqueCities')}
        </Text>
      </View>

      {routes.top_locations.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('insights.routes.topLocations')}
          </Text>
          {routes.top_locations.map((loc, idx) => (
            <View key={idx} style={[styles.locationRow, { borderBottomColor: colors.border }]}>
              <View style={styles.locationInfo}>
                <Text style={[styles.locationCity, { color: colors.textPrimary }]}>
                  {loc.city}
                  {loc.region ? `, ${loc.region}` : ''}
                </Text>
                <Text style={[styles.locationMeta, { color: colors.textMuted }]}>
                  {loc.count}x · {t('insights.routes.avgDistance', { km: loc.avg_distance_km.toFixed(1) })}
                </Text>
              </View>
              {loc.country && (
                <Text style={[styles.countryBadge, { color: colors.textMuted }]}>{loc.country}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {fingerprints && fingerprints.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('insights.routes.repeatedRoutes')}
          </Text>
          {fingerprints.map((fp, idx) => (
            <View key={idx} style={[styles.fingerprintRow, { borderBottomColor: colors.border }]}>
              <View style={styles.fingerprintInfo}>
                <View style={styles.fingerprintHeader}>
                  <Text style={[styles.fingerprintLabel, { color: colors.textPrimary }]}>
                    {fp.label}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {fp.is_loop ? t('insights.routes.loop') : t('insights.routes.outAndBack')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.fingerprintMeta, { color: colors.textMuted }]}>
                  {fp.activity_count}x · {fp.distance_km.toFixed(1)} km
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </InsightCard>
  );
}

const styles = StyleSheet.create({
  uniqueBox: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  uniqueValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  uniqueLabel: {
    fontSize: fontSize.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationInfo: {
    flex: 1,
  },
  locationCity: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  locationMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  countryBadge: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  fingerprintRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fingerprintInfo: {},
  fingerprintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fingerprintLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
  },
  fingerprintMeta: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
