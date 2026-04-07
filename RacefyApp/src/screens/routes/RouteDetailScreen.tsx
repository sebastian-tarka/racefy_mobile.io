import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Loading,
  ScreenHeader,
  ScreenContainer,
  Card,
  LeafletMap,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../services/api';
import { formatDistance, formatTotalTime } from '../../utils/formatters';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { PlannedRoute } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

export function RouteDetailScreen({ route: navRoute, navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { routeId } = navRoute.params;

  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = route?.user_id === user?.id;

  useEffect(() => {
    loadRoute();
  }, [routeId]);

  const loadRoute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getRoute(routeId);
      setRoute(data);
    } catch (err) {
      setError(t('routeDetail.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('routeDetail.delete'),
      t('routes.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteRoute(routeId);
              navigation.goBack();
            } catch {}
          },
        },
      ]
    );
  }, [routeId, navigation, t]);

  const handleDuplicate = useCallback(async () => {
    try {
      await api.duplicateRoute(routeId);
      Alert.alert(t('routes.duplicated'));
    } catch {}
  }, [routeId, t]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('routeDetail.title')} showBack onBack={() => navigation.goBack()} />
        <Loading />
      </ScreenContainer>
    );
  }

  if (error || !route) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('routeDetail.title')} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>{error || t('routeDetail.notFound')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        title={route.title}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map */}
        {route.geometry && (
          <View style={styles.mapContainer}>
            <LeafletMap
              trackData={route.geometry}
              height={250}
              showKmMarkers
            />
          </View>
        )}

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatItem
              icon="resize-outline"
              label={t('routeDetail.distance')}
              value={formatDistance(route.distance)}
              colors={colors}
            />
            <StatItem
              icon="trending-up-outline"
              label={t('routeDetail.elevation')}
              value={`${route.elevation_gain}m`}
              colors={colors}
            />
            <StatItem
              icon="time-outline"
              label={t('routeDetail.estimatedTime')}
              value={formatTotalTime(route.estimated_duration)}
              colors={colors}
            />
            <StatItem
              icon="walk-outline"
              label={t('routeDetail.profile')}
              value={route.profile === 'cycling' ? t('routes.cycling') : t('routes.walking')}
              colors={colors}
            />
          </View>
        </Card>

        {/* Description */}
        {route.description ? (
          <Card style={styles.sectionCard}>
            <Text style={[styles.description, { color: colors.textPrimary }]}>
              {route.description}
            </Text>
          </Card>
        ) : null}

        {/* Turn Instructions */}
        {route.turn_instructions && route.turn_instructions.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('routeDetail.turnInstructions')}
            </Text>
            {route.turn_instructions.map((turn, idx) => (
              <View key={idx} style={styles.turnRow}>
                <Ionicons
                  name={getTurnIcon(turn.maneuver)}
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.turnText, { color: colors.textPrimary }]}>
                  {turn.instruction}
                </Text>
                <Text style={[styles.turnDistance, { color: colors.textSecondary }]}>
                  {formatDistance(turn.distance_along)}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!isOwner && (
            <Button
              title={t('routeDetail.duplicate')}
              onPress={handleDuplicate}
              variant="outline"
            />
          )}
          {isOwner && (
            <Button
              title={t('routeDetail.delete')}
              onPress={handleDelete}
              variant="danger"
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatItem({ icon, label, value, colors }: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={20} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function getTurnIcon(maneuver: string): any {
  if (maneuver.includes('left')) return 'arrow-back-outline';
  if (maneuver.includes('right')) return 'arrow-forward-outline';
  if (maneuver.includes('u-turn')) return 'return-down-back-outline';
  return 'arrow-up-outline';
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sectionCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  turnText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  turnDistance: {
    fontSize: fontSize.xs,
  },
  actions: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
