/**
 * NearbyRoutesList - Scrollable list of nearby routes displayed below map in idle state
 * Shows route cards with distance, elevation, creator, and popularity stats
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { useUnits } from '../hooks/useUnits';
import { spacing, borderRadius } from '../theme/spacing';
import type { NearbyRoute } from './MapboxLiveMap';

interface NearbyRoutesListProps {
  routes: NearbyRoute[];
  selectedRouteId: number | null;
  onRouteSelect: (route: NearbyRoute) => void;
  isLoading: boolean;
  error: string | null;
}

export function NearbyRoutesList({
  routes,
  selectedRouteId,
  onRouteSelect,
  isLoading,
  error,
}: NearbyRoutesListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDistance, formatElevation } = useUnits();

  // Get sport icon based on sport_type_id (simplified mapping)
  const getSportIcon = (sportTypeId: number): any => {
    // Common sport type IDs (adjust based on your backend)
    switch (sportTypeId) {
      case 1: return 'walk'; // Running
      case 2: return 'bicycle'; // Cycling
      case 3: return 'walk'; // Walking
      case 4: return 'fitness'; // Gym
      default: return 'pulse'; // Generic
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t('recording.loadingRoutes')}
          </Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      </View>
    );
  }

  // Render empty state
  if (routes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('recording.noRoutesFound')}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
            {t('recording.noRoutesDescription')}
          </Text>
        </View>
      </View>
    );
  }

  // Render route card
  const renderRouteCard = ({ item }: { item: NearbyRoute }) => {
    const isSelected = item.id === selectedRouteId;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.background },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={() => onRouteSelect(item)}
        accessibilityLabel={t('recording.selectRoute')}
      >
        <View style={styles.cardHeader}>
          <Ionicons
            name={getSportIcon(item.sport_type_id)}
            size={20}
            color={isSelected ? colors.primary : colors.textMuted}
          />
          <Text
            style={[styles.title, { color: isSelected ? colors.primary : colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statGroup}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatDistance(item.distance)}
            </Text>
            {item.elevation_gain > 0 && (
              <View style={styles.elevationBadge}>
                <Ionicons name="arrow-up" size={12} color={colors.textMuted} />
                <Text style={[styles.elevationText, { color: colors.textMuted }]}>
                  {formatElevation(item.elevation_gain)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
              by {item.user.name}
            </Text>
            <View style={styles.likesContainer}>
              <Ionicons name="heart" size={12} color={colors.textMuted} />
              <Text style={[styles.likesText, { color: colors.textMuted }]}>
                {item.stats.likes_count}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>
          {t('recording.nearbyRoutes')}
        </Text>
        <Text style={[styles.countText, { color: colors.textMuted }]}>
          {t('recording.routesFound', { count: routes.length })}
        </Text>
      </View>

      <FlatList
        data={routes}
        renderItem={renderRouteCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal={false}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  elevationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  elevationText: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    maxWidth: 120,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    fontSize: 12,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
});
