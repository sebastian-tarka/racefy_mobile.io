import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  AnimatedListItem,
  EmptyState,
  EventCard,
  FeaturedEventCard,
  Loading,
  ScreenContainer,
} from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { useTabBarPadding } from '../../navigation/useTabBarPadding';
import { useTheme } from '../../hooks/useTheme';
import { useRefreshOn } from '../../services/refreshEvents';
import { borderRadius, fontSize, spacing } from '../../theme';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useMarkSectionSeen } from '../../hooks/useNavBadges';
import { EventsRewardsTab } from './events/EventsRewardsTab';
import { EventsSearchBar, EventsSearchResults } from './events/EventsSearch';
import { EventsOverviewSections, EventsStatsRow, type EventsFilter } from './events/EventsOverview';
import { useEventSearch } from './events/useEventSearch';
import { useEventsOverview } from './events/useEventsOverview';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Events'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterOption = EventsFilter;
type TabOption = 'events' | 'rewards';

export function EventsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  useMarkSectionSeen('events');
  const { colors } = useTheme();
  const tabBarPaddingBottom = useTabBarPadding();
  const { isAuthenticated } = useAuth();
  const { events, isLoading, isRefreshing, error, statusFilter, refresh, loadMore, changeFilter } =
    useEvents();

  const filters: { label: string; value: FilterOption }[] = [
    { label: t('events.filters.upcoming'), value: 'upcoming' },
    { label: t('events.filters.ongoing'), value: 'ongoing' },
    { label: t('events.filters.completed'), value: 'completed' },
    { label: t('events.filters.all'), value: 'all' },
  ];

  const [activeFilter, setActiveFilter] = useState<FilterOption>(
    route.params?.initialFilter || 'all',
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<TabOption>('events');

  const search = useEventSearch();
  const overview = useEventsOverview(isAuthenticated);
  const { fetchOverviewData } = overview;

  const refreshAll = useCallback(() => {
    refresh();
    fetchOverviewData();
  }, [refresh, fetchOverviewData]);

  useRefreshOn('events', refreshAll);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    changeFilter(activeFilter === 'all' ? undefined : activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (statusFilter !== undefined || activeFilter === 'all') {
      refresh();
    }
  }, [statusFilter]);

  const handleEventPress = useCallback(
    (eventId: number) => navigation.navigate('EventDetail', { eventId }),
    [navigation],
  );

  const renderTabs = () => {
    return (
      <View
        style={[
          styles.tabsContainer,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'events' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'events' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'events' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {t('rewards.tabs.events')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'rewards' && [styles.activeTab, { borderBottomColor: colors.primary }],
          ]}
          onPress={() => setActiveTab('rewards')}
        >
          <Ionicons
            name="gift-outline"
            size={20}
            color={activeTab === 'rewards' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              activeTab === 'rewards' && { color: colors.primary, fontWeight: '600' },
            ]}
          >
            {t('rewards.tabs.rewards')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {activeTab === 'rewards' ? t('rewards.title') : t('events.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {activeTab === 'rewards' ? t('rewards.subtitle') : t('events.subtitle')}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={search.toggleSearch}>
            <Ionicons
              name={search.isSearchVisible ? 'close' : 'search'}
              size={24}
              color={search.isSearchVisible ? colors.error : colors.textPrimary}
            />
          </TouchableOpacity>
          {isAuthenticated && activeTab === 'events' && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.textPrimary }]}
              onPress={() => navigation.navigate('EventForm', {})}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={[styles.createButtonText, { color: colors.white }]}>
                {t('events.create')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderTabs()}
      <EventsSearchBar search={search} />

      {search.isSearchVisible && search.searchQuery.length > 0 ? (
        <EventsSearchResults
          search={search}
          bottomPadding={tabBarPaddingBottom}
          onOpenEvent={handleEventPress}
        />
      ) : activeTab === 'rewards' ? (
        <EventsRewardsTab
          isAuthenticated={isAuthenticated}
          bottomPadding={tabBarPaddingBottom}
          onOpenEvent={handleEventPress}
        />
      ) : (
        <>
          <View
            style={[
              styles.filterContainer,
              { backgroundColor: colors.cardBackground, borderBottomColor: colors.border },
            ]}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      activeFilter === filter.value ? colors.textPrimary : 'transparent',
                    borderColor: activeFilter === filter.value ? colors.textPrimary : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(filter.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activeFilter === filter.value }}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: activeFilter === filter.value ? colors.white : colors.textSecondary,
                    },
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeFilter === 'all' ? (
            <ScrollView
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refreshAll}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              <EventsStatsRow activeFilter={activeFilter} overview={overview} />
              <EventsOverviewSections
                overview={overview}
                onOpenEvent={handleEventPress}
                onShowAll={setActiveFilter}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <AnimatedListItem index={index} animateKey={`event:${item.id}`}>
                  {index === 0 && activeFilter === 'upcoming' ? (
                    <FeaturedEventCard event={item} onPress={() => handleEventPress(item.id)} />
                  ) : (
                    <EventCard event={item} onPress={() => handleEventPress(item.id)} />
                  )}
                </AnimatedListItem>
              )}
              ListHeaderComponent={
                <EventsStatsRow activeFilter={activeFilter} overview={overview} />
              }
              ListEmptyComponent={
                isLoading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : error ? (
                  <EmptyState
                    icon="alert-circle-outline"
                    title={t('events.failedToLoad')}
                    message={error}
                    actionLabel={t('common.tryAgain')}
                    onAction={refresh}
                  />
                ) : (
                  <EmptyState
                    icon="calendar-outline"
                    title={t('events.noEvents')}
                    message={t('events.noEventsFiltered', {
                      filter: filters.find((f) => f.value === activeFilter)?.label,
                    })}
                    actionLabel={isAuthenticated ? t('events.createEvent') : undefined}
                    onAction={
                      isAuthenticated ? () => navigation.navigate('EventForm', {}) : undefined
                    }
                  />
                )
              }
              ListFooterComponent={
                isLoading && events.length > 0 ? (
                  <Loading message={t('common.loadingMore')} />
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={refreshAll}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarPaddingBottom }]}
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  // Tabs styles
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  // Stats styles
  // Search styles
  // Filter and list styles
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: borderRadius.full,
  },
  createButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  filterButton: {
    // Design "Racefy v2" (EventsScreen): the selected filter is the one solid
    // dark chip; the rest are outlines. Emerald is the brand accent and reads
    // as "go" — spending it on a list filter left nothing for the actions.
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  inlineLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  // Overview styles
});
