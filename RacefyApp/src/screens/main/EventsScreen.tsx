import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventCard, Loading, EmptyState, Button } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Events'>;

type FilterOption = 'all' | 'upcoming' | 'ongoing' | 'completed';

const filters: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Completed', value: 'completed' },
];

export function EventsScreen({ navigation }: Props) {
  const { isAuthenticated } = useAuth();
  const {
    events,
    isLoading,
    isRefreshing,
    hasMore,
    error,
    statusFilter,
    refresh,
    loadMore,
    changeFilter,
  } = useEvents();

  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    changeFilter(activeFilter === 'all' ? undefined : activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (statusFilter !== undefined || activeFilter === 'all') {
      refresh();
    }
  }, [statusFilter]);

  const handleEventPress = (eventId: number) => {
    // Navigate to event detail
    // navigation.navigate('EventDetail', { eventId });
  };

  if (isLoading && events.length === 0) {
    return <Loading fullScreen message="Loading events..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.subtitle}>Discover and join local sports events</Text>
        </View>
        {isAuthenticated && (
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterButton,
              activeFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.value && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => handleEventPress(item.id)} />
        )}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Failed to load events"
              message={error}
              actionLabel="Try Again"
              onAction={refresh}
            />
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No events found"
              message={
                activeFilter === 'all'
                  ? 'There are no events at the moment'
                  : `No ${activeFilter} events found`
              }
              actionLabel={isAuthenticated ? 'Create Event' : undefined}
              onAction={
                isAuthenticated
                  ? () => {
                      // Navigate to create event
                    }
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          isLoading && events.length > 0 ? (
            <Loading message="Loading more..." />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
});
