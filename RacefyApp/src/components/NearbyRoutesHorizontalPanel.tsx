import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { spacing, fontSize, borderRadius } from '../theme';

interface NearbyRoutesHorizontalPanelProps {
  routes: Array<any>;
  selectedRouteId: number | null;
  onRouteSelect: (route: any) => void;
  onClearRoute: () => void;
  isLoading: boolean;
  error: string | null;
}

export function NearbyRoutesHorizontalPanel({
  routes,
  selectedRouteId,
  onRouteSelect,
  onClearRoute,
  isLoading,
  error,
}: NearbyRoutesHorizontalPanelProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { formatDistanceShort } = useUnits();

  if (isLoading) {
    return (
      <View style={[styles.panel, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t('recording.loadingRoutes')}
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.panel, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (routes.length === 0) {
    return (
      <View style={[styles.panel, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('recording.noRoutesFound')}
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            {t('recording.noRoutesDescription')}
          </Text>
        </View>
      </View>
    );
  }

  const selectedColor = isDark ? '#60A5FA' : '#3B82F6';
  const selectedBorderColor = isDark ? '#3B82F6' : '#2563EB';

  return (
    <View style={[styles.panel, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Ionicons name="map" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('recording.nearbyRoutes')}
        </Text>
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {t('recording.routesFound', { count: routes.length })}
        </Text>
      </View>
      <FlatList
        horizontal
        data={routes}
        keyExtractor={(item) => `route-${item.id}`}
        renderItem={({ item: route }) => {
          const isSelected = selectedRouteId === route.id;

          return (
            <TouchableOpacity
              style={[
                styles.routeCard,
                { backgroundColor: colors.background, borderColor: colors.border },
                isSelected && {
                  borderColor: selectedBorderColor,
                  borderWidth: 2,
                  backgroundColor: isDark ? '#1E3A8A15' : '#EFF6FF',
                },
              ]}
              onPress={() => {
                if (isSelected) {
                  onClearRoute();
                } else {
                  onRouteSelect(route);
                }
              }}
              activeOpacity={0.7}
            >
              {isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: selectedColor }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <Text style={[styles.routeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {route.title}
              </Text>
              <View style={styles.routeStats}>
                <View style={styles.routeStat}>
                  <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.routeStatText, { color: colors.textSecondary }]}>
                    {formatDistanceShort(route.distance)}
                  </Text>
                </View>
                <View style={styles.routeStat}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.routeStatText, { color: colors.textSecondary }]}>
                    {Math.round(route.distance_from_user)}m
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.routeList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  count: {
    fontSize: fontSize.xs,
  },
  routeList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  routeCard: {
    width: 180,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginRight: spacing.md,
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  routeStats: {
    gap: spacing.xs,
  },
  routeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeStatText: {
    fontSize: fontSize.xs,
  },
});
