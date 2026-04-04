import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RouteCard, Loading, EmptyState, ScreenHeader, ScreenContainer } from '../../components';
import { useRoutes } from '../../hooks/useRoutes';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { PlannedRoute } from '../../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteLibrary'>;

type FilterOption = 'my' | 'popular' | 'nearby';

export function RouteLibraryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    routes,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    filter,
    refresh,
    loadMore,
    changeFilter,
    deleteRoute,
  } = useRoutes();

  const filters: { label: string; value: FilterOption }[] = [
    { label: t('routes.filters.my'), value: 'my' },
    { label: t('routes.filters.popular'), value: 'popular' },
    { label: t('routes.filters.nearby'), value: 'nearby' },
  ];

  const [activeFilter, setActiveFilter] = useState<FilterOption>('my');

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    changeFilter(activeFilter);
  }, [activeFilter]);

  // Trigger fetch when filter changes
  useEffect(() => {
    if (filter === activeFilter) {
      refresh();
    }
  }, [filter]);

  const handleFilterChange = useCallback((value: FilterOption) => {
    setActiveFilter(value);
  }, []);

  const handleRoutePress = useCallback((route: PlannedRoute) => {
    navigation.navigate('RouteDetail', { routeId: route.id });
  }, [navigation]);

  const handleDelete = useCallback(async (routeId: number) => {
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
              await deleteRoute(routeId);
            } catch {}
          },
        },
      ]
    );
  }, [deleteRoute, t]);

  const renderItem = useCallback(({ item }: { item: PlannedRoute }) => (
    <RouteCard
      route={item}
      onPress={() => handleRoutePress(item)}
    />
  ), [handleRoutePress]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="map-outline"
        title={t('routes.noRoutes')}
        message={t('routes.noRoutesMessage')}
      />
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('routes.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity onPress={() => navigation.navigate('RoutePlanner')} style={{ padding: spacing.xs }}>
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterTab,
              activeFilter === f.value && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleFilterChange(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f.value ? '#fff' : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={{ color: colors.error }}>{t('routes.failedToLoad')}</Text>
        </View>
      )}

      <FlatList
        data={routes}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoading && routes.length > 0 ? (
            <Loading />
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  errorContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
